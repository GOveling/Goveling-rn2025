import React, { useEffect, useState } from 'react';

import { Modal, Text, TouchableOpacity, View } from 'react-native';

import { supabase } from '~/lib/supabase';
import { getTripWithTeamRPC } from '~/lib/teamHelpers';

import { DecisionsTab } from './DecisionsTab';
import { ExpensesTab } from './ExpensesTab';

interface GroupOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Record<string, string | undefined>;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'editor' | 'viewer';
}

export const GroupOptionsModal: React.FC<GroupOptionsModalProps> = ({ visible, onClose, trip }) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'decisions'>('expenses');
  const [allParticipants, setAllParticipants] = useState<Collaborator[]>([]);

  // Load owner + collaborators using helper (owner, editor, viewer)
  useEffect(() => {
    const loadParticipants = async () => {
      try {
        if (!trip?.id) return;
        const team = await getTripWithTeamRPC(trip.id as string);
        const participantsList: Collaborator[] = [];

        // Owner first if resolved
        if (team.owner) {
          participantsList.push({
            id: team.owner.id,
            name: team.owner.full_name || team.owner.email?.split('@')[0] || 'Unknown',
            email: team.owner.email || '',
            avatar: team.owner.avatar_url || '',
            role: 'owner',
          });
        } else if (trip?.owner_id || trip?.user_id) {
          // Fallback: fetch owner profile if RPC did not resolve
          const ownerId = (trip.owner_id || trip.user_id) as string;
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .eq('id', ownerId)
            .maybeSingle();
          if (ownerData) {
            participantsList.push({
              id: ownerData.id,
              name: ownerData.full_name || 'Unknown',
              email: ownerData.email || '',
              avatar: ownerData.avatar_url || '',
              role: 'owner',
            });
          }
        }

        // Collaborators
        (team.collaborators || []).forEach((c) => {
          // Avoid duplicates with owner
          if (!participantsList.find((p) => p.id === c.id)) {
            participantsList.push({
              id: c.id,
              name: c.full_name || c.email?.split('@')[0] || 'Unknown',
              email: c.email || '',
              avatar: c.avatar_url || '',
              role: (c.role as 'editor' | 'viewer') || 'viewer',
            });
          }
        });

        setAllParticipants(participantsList);
      } catch (error) {
        console.error('Error loading participants (team helper):', error);
      }
    };

    loadParticipants();
  }, [trip?.id, trip?.owner_id, trip?.user_id]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 16,
            maxHeight: '98%',
            minHeight: '50%',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 8,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: '#1A1A1A',
                  marginBottom: 4,
                }}
              >
                Opciones del Grupo
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: '#6B7280',
                  fontWeight: '500',
                }}
              >
                {allParticipants.length}{' '}
                {allParticipants.length === 1 ? 'participante' : 'participantes'}
              </Text>
            </View>

            {/* Close button */}
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 24, fontWeight: '600', color: '#6B7280' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
              paddingHorizontal: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => setActiveTab('expenses')}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: activeTab === 'expenses' ? 2 : 0,
                borderBottomColor: activeTab === 'expenses' ? '#EA6123' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: activeTab === 'expenses' ? '#EA6123' : '#9CA3AF',
                }}
              >
                💰 Gastos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('decisions')}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: activeTab === 'decisions' ? 2 : 0,
                borderBottomColor: activeTab === 'decisions' ? '#EA6123' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: activeTab === 'decisions' ? '#EA6123' : '#9CA3AF',
                }}
              >
                🗳️ Decisiones
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Container */}
          <View style={{ flex: 1 }}>
            {activeTab === 'expenses' && (
              <ExpensesTab tripId={trip.id || ''} participants={allParticipants} />
            )}

            {activeTab === 'decisions' && (
              <DecisionsTab tripId={trip.id || ''} participants={allParticipants} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default GroupOptionsModal;
