import React, { useState } from 'react';

import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useSupabaseTripDecisions } from '~/hooks/useSupabaseTripDecisions';

interface DecisionsTabProps {
  tripId: string;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string;
  }>;
}

export const DecisionsTab: React.FC<DecisionsTabProps> = ({ tripId, participants }) => {
  const { decisions, loading, createDecision, deleteDecision, vote } =
    useSupabaseTripDecisions(tripId);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    options: ['', ''],
    selectedParticipants: participants.map((p) => p.id),
  });

  // Get participant name by ID
  const getParticipantName = (id: string) => {
    return participants.find((p) => p.id === id)?.name || 'Unknown';
  };

  // Handle create decision
  const handleCreateDecision = async () => {
    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      formData.options.some((o) => !o.trim())
    ) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      await createDecision({
        trip_id: tripId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        options: formData.options.map((o) => o.trim()),
        selected_participants: formData.selectedParticipants,
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
      });

      setFormData({
        title: '',
        description: '',
        options: ['', ''],
        selectedParticipants: participants.map((p) => p.id),
      });
      setShowForm(false);
      Alert.alert('Éxito', 'Votación creada correctamente');
    } catch (error) {
      Alert.alert(
        'Error',
        `No se pudo crear la votación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  };

  // Handle vote
  const handleVote = async (decisionId: string, optionIndex: number) => {
    try {
      await vote(decisionId, optionIndex);
      Alert.alert('Éxito', 'Tu voto ha sido registrado');
    } catch (error) {
      Alert.alert(
        'Error',
        `No se pudo registrar el voto: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  };

  // Handle delete decision
  const handleDeleteDecision = async (decisionId: string) => {
    Alert.alert('Confirmar', '¿Estás seguro de que deseas eliminar esta decisión?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Eliminar',
        onPress: async () => {
          try {
            await deleteDecision(decisionId);
            Alert.alert('Éxito', 'Decisión eliminada');
          } catch (error) {
            Alert.alert(
              'Error',
              `No se pudo eliminar: ${error instanceof Error ? error.message : 'Error desconocido'}`
            );
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 8, color: '#6B7280' }}>Cargando decisiones...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
            🗳️ Decisiones del Grupo
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            Crea votaciones y toma decisiones en grupo
          </Text>
        </View>

        {/* Create form */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
              Decisiones Activas
            </Text>
            <TouchableOpacity
              onPress={() => setShowForm(!showForm)}
              style={{
                backgroundColor: '#3B82F6',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>
                {showForm ? 'Cancelar' : '+ Nueva'}
              </Text>
            </TouchableOpacity>
          </View>

          {showForm && (
            <View
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                Título de la Votación
              </Text>
              <View
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              >
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>(Implementar TextInput aquí)</Text>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                Descripción
              </Text>
              <View
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              >
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>(Implementar TextInput aquí)</Text>
              </View>

              <TouchableOpacity
                onPress={handleCreateDecision}
                style={{
                  backgroundColor: '#10B981',
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Crear Votación</Text>
              </TouchableOpacity>
            </View>
          )}

          {decisions && decisions.length > 0 ? (
            <View>
              {decisions.map((decision) => (
                <View
                  key={decision.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#1A1A1A',
                          marginBottom: 4,
                        }}
                      >
                        {decision.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
                        {decision.description}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={{
                            backgroundColor: decision.status === 'active' ? '#DBEAFE' : '#F3F4F6',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: decision.status === 'active' ? '#1E40AF' : '#6B7280',
                            }}
                          >
                            {decision.status === 'active' ? '✓ Abierta' : '✓ Cerrada'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Options - Voting UI */}
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{ fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}
                    >
                      Opciones:
                    </Text>
                    <View style={{ gap: 8 }}>
                      {decision.options?.map((option, index) => {
                        const votes = decision.votes
                          ? decision.votes.filter((v) => v.option_index === index).length
                          : 0;
                        const totalVoters = participants.length;
                        const percentage =
                          totalVoters > 0 ? Math.round((votes / totalVoters) * 100) : 0;

                        return (
                          <TouchableOpacity
                            key={index}
                            onPress={() => {
                              if (decision.status === 'active') {
                                handleVote(decision.id, index);
                              }
                            }}
                            disabled={decision.status !== 'active'}
                            style={{
                              backgroundColor: decision.status === 'active' ? '#F9FAFB' : '#F3F4F6',
                              borderRadius: 8,
                              padding: 12,
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                              opacity: decision.status === 'active' ? 1 : 0.6,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '500', color: '#1A1A1A' }}>
                                {option}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View
                                  style={{
                                    width: 40,
                                    height: 24,
                                    backgroundColor: '#DBEAFE',
                                    borderRadius: 12,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Text
                                    style={{ fontSize: 12, fontWeight: '600', color: '#1E40AF' }}
                                  >
                                    {percentage}%
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 12, color: '#6B7280', minWidth: 20 }}>
                                  {votes}
                                </Text>
                              </View>
                            </View>
                            <View
                              style={{
                                height: 4,
                                backgroundColor: '#E5E7EB',
                                borderRadius: 2,
                                marginTop: 8,
                                overflow: 'hidden',
                              }}
                            >
                              <View
                                style={{
                                  height: '100%',
                                  width: `${percentage}%`,
                                  backgroundColor: '#3B82F6',
                                }}
                              />
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Delete button */}
                  <TouchableOpacity
                    onPress={() => handleDeleteDecision(decision.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text
                      style={{ color: '#EF4444', marginLeft: 6, fontSize: 12, fontWeight: '500' }}
                    >
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                padding: 40,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderStyle: 'dashed',
              }}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 }}>
                Sin decisiones
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                Crea una votación para que el grupo tome decisiones juntos
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};
