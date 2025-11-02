/**
 * TripChatModal.tsx - Versión Simplificada
 *
 * Sistema de chat grupal para viajes (implementación básica funcional)
 * Sin optimizaciones avanzadas - Implementación directa
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
  StyleSheet,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';

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
  created_at: string;
  user_full_name: string;
  user_avatar_url?: string;
  user_email: string;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);

  // ============================================================
  // FORMAT TIME
  // ============================================================

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
  // LOAD MESSAGES
  // ============================================================

  const loadMessages = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_trip_messages_paginated', {
        p_trip_id: tripId,
        p_limit: 100,
        p_offset: 0,
      });

      if (error) throw error;

      if (data) {
        // Invertir array para mostrar más recientes al final
        setMessages(data.reverse());
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
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
      onUnreadCountChange?.(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  // ============================================================
  // MARK AS READ
  // ============================================================

  const markAsRead = async () => {
    try {
      await supabase.rpc('mark_messages_as_read', {
        p_trip_id: tripId,
        p_message_ids: null,
      });

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

      setInputText('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  // ============================================================
  // REALTIME SUBSCRIPTION
  // ============================================================

  const subscribeToMessages = () => {
    if (!visible || !tripId) return;

    channelRef.current = supabase
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

          // Enriquecer mensaje con datos de perfil
          const { data: profileData } = await supabase.rpc('get_trip_members_profiles', {
            p_trip_id: tripId,
          });

          if (profileData) {
            const profile = profileData.find((p: any) => p.id === newMessage.user_id);
            if (profile) {
              newMessage.user_full_name = profile.full_name || profile.email || 'Usuario';
              newMessage.user_avatar_url = profile.avatar_url || null;
              newMessage.user_email = profile.email || '';
            } else {
              // Fallback si no se encuentra el perfil
              newMessage.user_full_name = 'Usuario';
              newMessage.user_email = '';
            }
          } else {
            // Fallback si falla la llamada RPC
            newMessage.user_full_name = 'Usuario';
            newMessage.user_email = '';
          }

          setMessages((prev) => [...prev, newMessage]);
          setTimeout(() => scrollToBottom(), 100);
        }
      )
      .subscribe();
  };

  const unsubscribeFromMessages = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (visible && tripId) {
      loadMessages();
      loadUnreadCount();
      subscribeToMessages();
      setTimeout(() => markAsRead(), 1000);
    } else {
      unsubscribeFromMessages();
    }

    return () => {
      unsubscribeFromMessages();
    };
  }, [visible, tripId]);

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const getUserInitials = (fullName: string, email: string): string => {
    // Validación segura para evitar errores con undefined/null
    if (fullName && typeof fullName === 'string' && fullName.trim().length > 0) {
      const names = fullName.trim().split(' ');
      if (names.length >= 2 && names[0].length > 0 && names[names.length - 1].length > 0) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return fullName.slice(0, 2).toUpperCase();
    }

    // Fallback a email si existe
    if (email && typeof email === 'string' && email.length >= 2) {
      return email.slice(0, 2).toUpperCase();
    }

    // Fallback final
    return '??';
  };

  // ============================================================
  // RENDER MESSAGE
  // ============================================================

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.user_id === currentUserId;

    // Validación defensiva de datos del usuario
    const userName = item.user_full_name || item.user_email || 'Usuario';
    const userEmail = item.user_email || '';

    return (
      <View style={[styles.messageRow, isMyMessage && styles.messageRowRight]}>
        {!isMyMessage && (
          <View style={styles.avatarContainer}>
            {item.user_avatar_url ? (
              <Image source={{ uri: item.user_avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getUserInitials(userName, userEmail)}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.messageContent}>
          {!isMyMessage && <Text style={styles.senderName}>{userName}</Text>}

          <View
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
            ]}
          >
            <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
              {item.message}
            </Text>
          </View>

          <Text style={[styles.messageTime, isMyMessage && styles.messageTimeRight]}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <LinearGradient colors={[COLORS.primary.main, COLORS.primary.blue]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Chat Grupal</Text>
              <Text style={styles.headerSubtitle}>{tripTitle}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Messages List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary.main} />
            <Text style={styles.loadingText}>Cargando mensajes...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.text.lightGray} />
            <Text style={styles.emptyTitle}>Aún no hay mensajes</Text>
            <Text style={styles.emptyText}>Sé el primero en iniciar la conversación</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORS.text.lightGray}
            multiline
            maxLength={1000}
            style={styles.textInput}
            editable={!sending}
            onSubmitEditing={() => {
              if (inputText.trim() && !sending) {
                sendMessage();
              }
            }}
            blurOnSubmit={false}
            returnKeyType="send"
          />

          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
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

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  messagesList: {
    paddingVertical: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  messageContent: {
    maxWidth: '75%',
  },
  senderName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary.main,
    borderTopRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: COLORS.utility.white,
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.text.primary,
  },
  myMessageText: {
    color: COLORS.utility.white,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.text.lightGray,
    marginTop: 4,
    marginLeft: 12,
  },
  messageTimeRight: {
    textAlign: 'right',
    marginLeft: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
    backgroundColor: COLORS.utility.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.text.primary,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: COLORS.primary.main,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.text.lightGray,
  },
});

export default TripChatModal;
