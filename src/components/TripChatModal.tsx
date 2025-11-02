/**
 * TripChatModal.tsx
 *
 * Modal de chat grupal optimizado para viajes con:
 * - Paginación infinita
 * - Caché local con AsyncStorage
 * - Batch fetch de perfiles
 * - Notificaciones con badges
 * - Indicador "escribiendo..." en tiempo real
 * - Optimizaciones para iOS/Android
 */

import React, { useState, useEffect, useRef } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Vibration,
  AppState,
  AppStateStatus,
} from 'react-native';

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '~/constants/colors';
import { supabase } from '~/lib/supabase';
import { getCurrentUser } from '~/lib/userUtils';

// ============================================================
// TYPES
// ============================================================

interface TripChatModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
  onUnreadCountChange?: (count: number) => void;
}

interface Message {
  id: string;
  trip_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'image' | 'location' | 'system';
  media_url?: string;
  media_thumbnail_url?: string;
  latitude?: number;
  longitude?: number;
  is_system_message: boolean;
  created_at: string;
  updated_at: string;
  user_full_name: string;
  user_avatar_url?: string;
  user_email: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
}

interface TypingUser {
  id: string;
  full_name: string;
  timestamp: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const MESSAGES_PER_PAGE = 30;
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 horas
const TYPING_TIMEOUT_MS = 3000; // 3 segundos
const TYPING_THROTTLE_MS = 1000; // 1 segundo
const MAX_MESSAGE_LENGTH = 1000;

// ============================================================
// COMPONENT
// ============================================================

const TripChatModal: React.FC<TripChatModalProps> = ({
  visible,
  onClose,
  tripId,
  tripTitle,
  onUnreadCountChange,
}) => {
  // ================== STATE ==================
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [unreadCount, setUnreadCount] = useState(0);

  // ================== REFS ==================
  const flatListRef = useRef<FlatList>(null);
  const messageChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ============================================================
  // CACHE HELPERS
  // ============================================================

  const getCacheKey = (tripId: string) => `trip_chat_messages_${tripId}`;
  const getCacheTimestampKey = (tripId: string) => `trip_chat_timestamp_${tripId}`;

  const loadMessagesFromCache = async (): Promise<Message[] | null> => {
    try {
      const cacheKey = getCacheKey(tripId);
      const timestampKey = getCacheTimestampKey(tripId);

      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(cacheKey),
        AsyncStorage.getItem(timestampKey),
      ]);

      if (!cachedData || !cachedTimestamp) return null;

      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();

      // Verificar si el caché expiró
      if (now - timestamp > CACHE_EXPIRY_MS) {
        await AsyncStorage.multiRemove([cacheKey, timestampKey]);
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      console.error('Error loading messages from cache:', error);
      return null;
    }
  };

  const saveMessagesToCache = async (messages: Message[]): Promise<void> => {
    try {
      const cacheKey = getCacheKey(tripId);
      const timestampKey = getCacheTimestampKey(tripId);

      // Solo guardar los últimos 100 mensajes
      const messagesToCache = messages.slice(-100);

      await AsyncStorage.multiSet([
        [cacheKey, JSON.stringify(messagesToCache)],
        [timestampKey, Date.now().toString()],
      ]);
    } catch (error) {
      console.error('Error saving messages to cache:', error);
    }
  };

  // ============================================================
  // LOAD USER PROFILES (BATCH)
  // ============================================================

  const loadUserProfiles = async () => {
    try {
      const { data, error } = await supabase.rpc('get_trip_members_profiles', {
        p_trip_id: tripId,
      });

      if (error) throw error;

      const profilesMap = new Map<string, UserProfile>();
      data?.forEach((profile: UserProfile) => {
        profilesMap.set(profile.id, profile);
      });

      setUserProfiles(profilesMap);
    } catch (error) {
      console.error('Error loading user profiles:', error);
    }
  };

  // ============================================================
  // LOAD MESSAGES (PAGINATED)
  // ============================================================

  const loadMessages = async (isInitial: boolean = true) => {
    try {
      if (isInitial) {
        setLoading(true);

        // Intentar cargar desde caché primero
        const cachedMessages = await loadMessagesFromCache();
        if (cachedMessages && cachedMessages.length > 0) {
          setMessages(cachedMessages.reverse()); // Del más reciente al más antiguo
          scrollToBottom();
        }
      } else {
        setLoadingMore(true);
      }

      const offset = isInitial ? 0 : messages.length;

      const { data, error } = await supabase.rpc('get_trip_messages_paginated', {
        p_trip_id: tripId,
        p_limit: MESSAGES_PER_PAGE,
        p_offset: offset,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedMessages = data.reverse(); // Del más antiguo al más reciente en la lista

        if (isInitial) {
          setMessages(formattedMessages);
          // Guardar en caché
          await saveMessagesToCache(formattedMessages);
        } else {
          setMessages((prev) => [...formattedMessages, ...prev]);
        }

        setHasMore(data.length === MESSAGES_PER_PAGE);
      } else {
        setHasMore(false);
      }

      if (isInitial) {
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // ============================================================
  // LOAD UNREAD COUNT
  // ============================================================

  const loadUnreadCount = async () => {
    try {
      const { data, error } = await supabase.rpc('get_unread_messages_count', {
        p_trip_id: tripId,
      });

      if (error) throw error;

      const count = data || 0;
      setUnreadCount(count);
      onUnreadCountChange?.(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  // ============================================================
  // MARK MESSAGES AS READ
  // ============================================================

  const markMessagesAsRead = async () => {
    try {
      await supabase.rpc('mark_messages_as_read', {
        p_trip_id: tripId,
        p_message_ids: null, // Marcar todos como leídos
      });

      setUnreadCount(0);
      onUnreadCountChange?.(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || sending) return;

    if (trimmedText.length > MAX_MESSAGE_LENGTH) {
      Alert.alert(
        'Mensaje muy largo',
        `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres`
      );
      return;
    }

    try {
      setSending(true);

      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'No se pudo verificar la autenticación');
        return;
      }

      const { error } = await supabase.from('trip_messages').insert({
        trip_id: tripId,
        user_id: user.id,
        message: trimmedText,
        message_type: 'text',
      });

      if (error) throw error;

      // Limpiar input
      setInputText('');

      // Vibración de confirmación
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Vibration.vibrate(50);
      }

      // Detener indicador de "escribiendo..."
      stopTypingIndicator();
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  // ============================================================
  // TYPING INDICATOR
  // ============================================================

  const sendTypingIndicator = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;

    lastTypingSentRef.current = now;

    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({
        user_id: currentUserId,
        typing: true,
        timestamp: now,
      });
    }

    // Auto-detener después de timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTypingIndicator();
    }, TYPING_TIMEOUT_MS);
  };

  const stopTypingIndicator = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (presenceChannelRef.current && currentUserId) {
      presenceChannelRef.current.track({
        user_id: currentUserId,
        typing: false,
        timestamp: Date.now(),
      });
    }
  };

  // ============================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================

  const subscribeToMessages = () => {
    if (!visible || !tripId) return;

    // Canal de mensajes
    messageChannelRef.current = supabase
      .channel(`trip_chat_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Enriquecer con perfil del usuario
          const userProfile = userProfiles.get(newMessage.user_id);
          if (userProfile) {
            newMessage.user_full_name = userProfile.full_name;
            newMessage.user_avatar_url = userProfile.avatar_url;
            newMessage.user_email = userProfile.email;
          }

          setMessages((prev) => [...prev, newMessage]);

          // Actualizar caché
          setMessages((currentMessages) => {
            saveMessagesToCache(currentMessages);
            return currentMessages;
          });

          // Scroll automático
          setTimeout(() => scrollToBottom(), 100);

          // Vibración si no es mi mensaje
          if (newMessage.user_id !== currentUserId) {
            if (Platform.OS === 'ios') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Vibration.vibrate(100);
            }

            // Incrementar unread si la app está en background
            if (appStateRef.current !== 'active') {
              setUnreadCount((prev) => prev + 1);
              onUnreadCountChange?.((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    // Canal de presencia (typing indicator)
    presenceChannelRef.current = supabase.channel(`trip_presence_${tripId}`, {
      config: { presence: { key: Math.random().toString(36) } },
    });

    presenceChannelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannelRef.current?.presenceState();
        if (!state) return;

        const typing = new Map<string, TypingUser>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (
              presence.typing &&
              presence.user_id !== currentUserId &&
              Date.now() - presence.timestamp < TYPING_TIMEOUT_MS
            ) {
              const profile = userProfiles.get(presence.user_id);
              if (profile) {
                typing.set(presence.user_id, {
                  id: presence.user_id,
                  full_name: profile.full_name,
                  timestamp: presence.timestamp,
                });
              }
            }
          });
        });

        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUserId) {
          await presenceChannelRef.current.track({
            user_id: currentUserId,
            typing: false,
            timestamp: Date.now(),
          });
        }
      });
  };

  const unsubscribeFromMessages = () => {
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }

    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================

  // Cargar usuario actual
  useEffect(() => {
    const loadCurrentUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    loadCurrentUser();
  }, []);

  // Cargar mensajes y perfiles al abrir
  useEffect(() => {
    if (visible && tripId) {
      loadUserProfiles();
      loadMessages(true);
      loadUnreadCount();
      subscribeToMessages();

      // Marcar como leídos al abrir
      setTimeout(() => markMessagesAsRead(), 1000);
    } else {
      unsubscribeFromMessages();
    }

    return () => {
      unsubscribeFromMessages();
      stopTypingIndicator();
    };
  }, [visible, tripId]);

  // Listener de AppState para notificaciones
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;

      if (nextAppState === 'active' && visible) {
        // Al volver a la app, marcar como leídos
        markMessagesAsRead();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [visible]);

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const loadMoreMessages = () => {
    if (!loadingMore && hasMore) {
      loadMessages(false);
    }
  };

  const getUserInitials = (fullName: string, email: string): string => {
    if (fullName) {
      const names = fullName.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return fullName.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `hace ${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `hace ${diffDays}d`;

    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  // ============================================================
  // RENDER MESSAGE ITEM
  // ============================================================

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.user_id === currentUserId;
    const profile = userProfiles.get(item.user_id);

    return (
      <View
        style={{
          flexDirection: 'row',
          marginBottom: 16,
          justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
          paddingHorizontal: 16,
        }}
      >
        {!isMyMessage && (
          <View style={{ marginRight: 8 }}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                }}
              />
            ) : (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.primary.purple,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                  {getUserInitials(item.user_full_name, item.user_email)}
                </Text>
              </View>
            )}
          </View>
        )}

        <View
          style={{
            maxWidth: '75%',
          }}
        >
          {!isMyMessage && (
            <Text
              style={{
                fontSize: 12,
                color: COLORS.text.tertiary,
                marginBottom: 4,
                marginLeft: 12,
              }}
            >
              {item.user_full_name}
            </Text>
          )}

          <View
            style={{
              backgroundColor: isMyMessage ? COLORS.primary.purple : COLORS.utility.white,
              borderRadius: 16,
              borderTopRightRadius: isMyMessage ? 4 : 16,
              borderTopLeftRadius: isMyMessage ? 16 : 4,
              padding: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                color: isMyMessage ? COLORS.utility.white : COLORS.text.primary,
                lineHeight: 20,
              }}
            >
              {item.message}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 11,
              color: COLORS.text.lightGray,
              marginTop: 4,
              marginLeft: isMyMessage ? 0 : 12,
              textAlign: isMyMessage ? 'right' : 'left',
            }}
          >
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  // ============================================================
  // RENDER TYPING INDICATOR
  // ============================================================

  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null;

    const typingArray = Array.from(typingUsers.values());
    const names = typingArray.map((u) => u.full_name).join(', ');

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: COLORS.background.secondary,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.primary.purple,
              marginRight: 4,
            }}
          />
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.primary.purple,
              marginRight: 4,
              opacity: 0.6,
            }}
          />
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.primary.purple,
              opacity: 0.3,
            }}
          />
        </View>
        <Text
          style={{
            fontSize: 13,
            color: COLORS.text.tertiary,
            marginLeft: 8,
          }}
        >
          {names} {typingUsers.size === 1 ? 'está' : 'están'} escribiendo...
        </Text>
      </View>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background.primary }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary.purple, COLORS.primary.blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingTop: Platform.OS === 'ios' ? 50 : 20,
            paddingBottom: 16,
            paddingHorizontal: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={onClose} style={{ marginRight: 16 }}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: 'white' }}>Chat Grupal</Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                {tripTitle}
              </Text>
            </View>

            {typingUsers.size > 0 && (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: 'white', fontWeight: '600' }}>
                  {typingUsers.size} escribiendo
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Messages List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary.purple} />
            <Text style={{ marginTop: 16, fontSize: 15, color: COLORS.text.tertiary }}>
              Cargando mensajes...
            </Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.text.lightGray} />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: COLORS.text.secondary,
                marginTop: 16,
              }}
            >
              Aún no hay mensajes
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: COLORS.text.tertiary,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              Sé el primero en iniciar la conversación
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingVertical: 16 }}
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.5}
              ListHeaderComponent={
                loadingMore ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={COLORS.primary.purple} />
                  </View>
                ) : null
              }
            />
            {renderTypingIndicator()}
          </>
        )}

        {/* Input Area */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: COLORS.utility.white,
            borderTopWidth: 1,
            borderTopColor: COLORS.border.light,
          }}
        >
          <TextInput
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              if (text.length > 0) {
                sendTypingIndicator();
              } else {
                stopTypingIndicator();
              }
            }}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORS.text.lightGray}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            style={{
              flex: 1,
              backgroundColor: COLORS.background.secondary,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              maxHeight: 100,
              color: COLORS.text.primary,
            }}
            editable={!sending}
          />

          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            style={{
              marginLeft: 8,
              backgroundColor:
                inputText.trim() && !sending ? COLORS.primary.purple : COLORS.text.lightGray,
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default TripChatModal;
