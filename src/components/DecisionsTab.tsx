import React, { useState } from 'react';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '~/contexts/AuthContext';
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
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    options: ['', ''],
    selectedParticipants: participants.map((p) => p.id),
    endDate: '',
  });

  // Helpers
  const getParticipantName = (id?: string) => {
    if (!id) return 'Desconocido';
    const p = participants.find((pp) => pp.id === id);
    return p?.name || p?.email || 'Desconocido';
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return iso;
    }
  };

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const formatForInput = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
      d.getMinutes()
    )}`;
  const parseDateTimeInput = (s: string): string => {
    if (!s) return '';
    const normalized = s.trim().replace(' ', 'T');
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  };

  // Helper reserved if we later show names in results (unused currently)

  // Handle create decision
  const handleCreateDecision = async () => {
    if (!formData.title.trim() || formData.options.some((o) => !o.trim())) {
      Alert.alert('Error', 'Por favor completa el título y al menos dos opciones');
      return;
    }

    // Optional end date validation
    let endDateISO: string | undefined = undefined;
    if (formData.endDate) {
      const parsed = parseDateTimeInput(formData.endDate);
      if (!parsed) {
        Alert.alert('Fecha inválida', 'Usa el formato YYYY-MM-DD HH:mm');
        return;
      }
      if (new Date(parsed).getTime() <= Date.now()) {
        Alert.alert('Fecha inválida', 'La fecha límite debe ser en el futuro');
        return;
      }
      endDateISO = parsed;
    }

    try {
      await createDecision({
        trip_id: tripId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        options: formData.options.map((o) => o.trim()),
        selected_participants: formData.selectedParticipants,
        end_date: endDateISO,
        status: 'active',
      });

      setFormData({
        title: '',
        description: '',
        options: ['', ''],
        selectedParticipants: participants.map((p) => p.id),
        endDate: '',
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
      const decision = decisions.find((d) => d.id === decisionId);
      // Basic front-end validations: status, expiration, and eligibility
      if (!decision) return;
      if (decision.status !== 'active') {
        Alert.alert('Votación cerrada', 'Esta decisión ya no acepta votos');
        return;
      }
      if (decision.end_date && new Date(decision.end_date) < new Date()) {
        Alert.alert('Votación expirada', 'Esta decisión ya alcanzó su fecha límite');
        return;
      }
      if (
        Array.isArray(decision.selected_participants) &&
        decision.selected_participants.length > 0 &&
        user?.id &&
        !decision.selected_participants.includes(user.id)
      ) {
        Alert.alert('No elegible', 'No estás habilitado para votar en esta decisión');
        return;
      }
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
              <TextInput
                placeholder="Ej: ¿Dónde cenamos?"
                placeholderTextColor="#9CA3AF"
                value={formData.title}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  fontSize: 14,
                  color: '#111827',
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                Descripción (opcional)
              </Text>
              <TextInput
                placeholder="Describe brevemente la decisión"
                placeholderTextColor="#9CA3AF"
                value={formData.description}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                multiline
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  fontSize: 14,
                  color: '#111827',
                  minHeight: 48,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                Opciones (mínimo 2)
              </Text>
              {formData.options.map((opt, idx) => (
                <TextInput
                  key={idx}
                  placeholder={`Opción ${idx + 1}`}
                  placeholderTextColor="#9CA3AF"
                  value={opt}
                  onChangeText={(text) =>
                    setFormData((prev) => {
                      const next = [...prev.options];
                      next[idx] = text;
                      return { ...prev, options: next };
                    })
                  }
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    fontSize: 14,
                    color: '#111827',
                  }}
                />
              ))}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() =>
                    setFormData((prev) => ({ ...prev, options: [...prev.options, ''] }))
                  }
                  style={{
                    backgroundColor: '#E5E7EB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#374151', fontWeight: '600', fontSize: 12 }}>
                    + Opción
                  </Text>
                </TouchableOpacity>
                {formData.options.length > 2 && (
                  <TouchableOpacity
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, options: prev.options.slice(0, -1) }))
                    }
                    style={{
                      backgroundColor: '#FEE2E2',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: '#B91C1C', fontWeight: '600', fontSize: 12 }}>
                      − Quitar última
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Deadline (optional) */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                Fecha límite (opcional)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: formatForInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
                    }))
                  }
                  style={{
                    backgroundColor: '#E5E7EB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#374151', fontWeight: '600', fontSize: 12 }}>+24h</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: formatForInput(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
                    }))
                  }
                  style={{
                    backgroundColor: '#E5E7EB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#374151', fontWeight: '600', fontSize: 12 }}>3 días</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: formatForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                    }))
                  }
                  style={{
                    backgroundColor: '#E5E7EB',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#374151', fontWeight: '600', fontSize: 12 }}>7 días</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFormData((prev) => ({ ...prev, endDate: '' }))}
                  style={{
                    backgroundColor: '#FEE2E2',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#B91C1C', fontWeight: '600', fontSize: 12 }}>Limpiar</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                placeholder="YYYY-MM-DD HH:mm"
                placeholderTextColor="#9CA3AF"
                value={formData.endDate}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, endDate: text }))}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  fontSize: 14,
                  color: '#111827',
                }}
              />
              {formData.endDate ? (
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                  Seleccionada: {formatDateTime(parseDateTimeInput(formData.endDate))}
                </Text>
              ) : null}

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
                      {/* Creator and created_at info */}
                      <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
                        Creado por: {getParticipantName(decision.created_by)} ·{' '}
                        {formatDateTime(decision.created_at)}
                      </Text>
                      {decision.end_date ? (
                        <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
                          Fecha límite: {formatDateTime(decision.end_date)}
                        </Text>
                      ) : null}
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

                  {/* Responded vs pending */}
                  {(() => {
                    const eligibleIds =
                      Array.isArray(decision.selected_participants) &&
                      decision.selected_participants.length > 0
                        ? decision.selected_participants
                        : participants.map((p) => p.id);
                    const answeredIds = Array.from(
                      new Set((decision.votes || []).map((v) => v.user_id))
                    );
                    const pendingIds = eligibleIds.filter((id) => !answeredIds.includes(id));
                    const answeredNames = answeredIds.map((id) => getParticipantName(id));
                    const pendingNames = pendingIds.map((id) => getParticipantName(id));
                    return (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                          Respuestas: {answeredIds.length}/{eligibleIds.length}
                        </Text>
                        {answeredIds.length > 0 && (
                          <Text style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>
                            Han respondido: {answeredNames.join(', ')}
                          </Text>
                        )}
                        {pendingIds.length > 0 && (
                          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                            Faltan: {pendingNames.join(', ')}
                          </Text>
                        )}
                      </View>
                    );
                  })()}

                  {/* Options - Voting UI */}
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{ fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}
                    >
                      Opciones:
                    </Text>
                    <View style={{ gap: 8 }}>
                      {decision.options?.map((option, index) => {
                        // Aggregate votes by option
                        const votesByOption = (decision.votes || []).reduce(
                          (acc: Record<number, number>, v) => {
                            acc[v.option_index] = (acc[v.option_index] || 0) + 1;
                            return acc;
                          },
                          {}
                        );
                        const totalVotes = (decision.votes || []).length;
                        const voteCount = votesByOption[index] || 0;
                        const percentage =
                          totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                        const hasVoted = (decision.votes || []).some(
                          (v) => v.user_id === user?.id && v.option_index === index
                        );

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
                                  {voteCount}
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
                                  backgroundColor: hasVoted ? '#10B981' : '#3B82F6',
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
