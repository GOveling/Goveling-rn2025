import React, { useMemo, useState } from 'react';

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

import { useSupabaseTripExpenses } from '~/hooks/useSupabaseTripExpenses';
import {
  calculateGlobalSettlements,
  calculatePersonBalance,
  type CollaboratorForCalc,
  type TripExpenseForCalc,
  type Settlement,
  type PaymentRecord,
  remainingForSettlement,
  getPaymentsTotal,
  round2,
  getAdjustedBalance,
} from '~/utils/splitCosts';

interface ExpensesTabProps {
  tripId: string;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string;
  }>;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ tripId, participants }) => {
  const { expenses, loading, createExpense, deleteExpense } = useSupabaseTripExpenses(tripId);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    paid_by: [] as string[], // IDs
    split_between: participants.map((p) => p.id), // IDs
  });
  // local-only payments history: key "DebtorName→CreditorName"
  const [paymentHistory, setPaymentHistory] = useState<Record<string, PaymentRecord[]>>({});

  const AddPaymentRow: React.FC<{ onAdd: (amount: number) => void }> = ({ onAdd }) => {
    const [value, setValue] = useState('');
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
        <TextInput
          placeholder="Monto"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          value={value}
          onChangeText={(t) => setValue(t.replace(/[^0-9.]/g, ''))}
          style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: 8,
            padding: 10,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            color: '#111827',
          }}
        />
        <TouchableOpacity
          onPress={() => {
            const n = parseFloat(value || '0');
            if (!isNaN(n) && n > 0) {
              onAdd(n);
              setValue('');
            }
          }}
          style={{
            backgroundColor: '#111827',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Registrar pago</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Get participant name by ID
  const getParticipantName = (id: string) => {
    return participants.find((p) => p.id === id)?.name || 'Unknown';
  };
  // const _getParticipantById = (id: string) => participants.find((p) => p.id === id);
  // const _allNames = participants.map((p) => p.name);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };

  // Handle create expense
  const handleCreateExpense = async () => {
    if (!formData.description.trim() || !formData.amount || formData.paid_by.length === 0) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      await createExpense({
        trip_id: tripId,
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        paid_by: formData.paid_by,
        split_between:
          formData.split_between.length > 0 ? formData.split_between : formData.paid_by,
      });

      setFormData({
        description: '',
        amount: '',
        paid_by: [],
        split_between: participants.map((p) => p.id),
      });
      setShowForm(false);
      Alert.alert('Éxito', 'Gasto registrado correctamente');
    } catch (error) {
      Alert.alert(
        'Error',
        `No se pudo crear el gasto: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  };

  // Handle delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    Alert.alert('Confirmar', '¿Estás seguro de que deseas eliminar este gasto?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Eliminar',
        onPress: async () => {
          try {
            await deleteExpense(expenseId);
            Alert.alert('Éxito', 'Gasto eliminado');
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

  // Transform DB expenses (IDs) to calc model (names)
  const calcParticipants: CollaboratorForCalc[] = useMemo(
    () =>
      participants.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        avatar: p.avatar,
        role: 'member',
      })),
    [participants]
  );

  const idToName = useMemo(() => {
    const map: Record<string, string> = {};
    participants.forEach((p) => (map[p.id] = p.name));
    return map;
  }, [participants]);

  const expensesForCalc: TripExpenseForCalc[] = useMemo(() => {
    return (expenses || []).map((e) => ({
      id: e.id,
      trip_id: e.trip_id,
      description: e.description,
      amount: e.amount,
      paid_by: (e.paid_by || []).map((id) => idToName[id] || 'Unknown'),
      split_between: (e.split_between || []).map((id) => idToName[id] || 'Unknown'),
      created_at: e.created_at,
      updated_at: e.updated_at,
      created_by: e.created_by,
    }));
  }, [expenses, idToName]);

  const perPersonBalances: Record<string, number> = useMemo(() => {
    const result: Record<string, number> = {};
    calcParticipants.forEach((p) => {
      const adjusted = getAdjustedBalance(
        p.name,
        expensesForCalc,
        calcParticipants,
        paymentHistory
      );
      result[p.name] = round2(adjusted);
    });
    return result;
  }, [calcParticipants, expensesForCalc, paymentHistory]);

  const settlements: Settlement[] = useMemo(
    () => calculateGlobalSettlements(expensesForCalc, calcParticipants),
    [expensesForCalc, calcParticipants]
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 8, color: '#6B7280' }}>Cargando gastos...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
            💰 Gastos Compartidos
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            Registra y gestiona los gastos del grupo
          </Text>
        </View>

        {/* Balance Summary */}
        {expenses && expenses.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              Resumen de Saldo
            </Text>
            <View
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              {participants.map((participant) => {
                const userBalance = perPersonBalances[participant.name] || 0;
                const isDebt = userBalance < 0;

                return (
                  <View
                    key={participant.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: '#E5E7EB',
                    }}
                  >
                    <Text style={{ fontSize: 14, color: '#1A1A1A', fontWeight: '500' }}>
                      {participant.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: isDebt ? '#EF4444' : '#10B981',
                      }}
                    >
                      {isDebt ? '−' : '+'}
                      {formatCurrency(Math.abs(userBalance))}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Global Settlements */}
        {settlements.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              Liquidaciones sugeridas
            </Text>
            <View
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              {settlements.map((s, idx) => {
                const key = `${s.from}→${s.to}`;
                const totalPaid = getPaymentsTotal(paymentHistory[key] || []);
                const remaining = remainingForSettlement(s, paymentHistory);
                return (
                  <View
                    key={`${s.from}-${s.to}-${idx}`}
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: '#E5E7EB',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#111827' }}>
                      <Text style={{ fontWeight: '700' }}>{s.from}</Text> →{' '}
                      <Text style={{ fontWeight: '700' }}>{s.to}</Text> por{' '}
                      <Text style={{ fontWeight: '700' }}>{formatCurrency(s.amount)}</Text>
                    </Text>
                    {totalPaid > 0 && (
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        Pagado: {formatCurrency(totalPaid)} · Restante: {formatCurrency(remaining)}
                      </Text>
                    )}
                    {/* Add payment input */}
                    {remaining > 0 && (
                      <AddPaymentRow
                        onAdd={(amount) => {
                          if (amount <= 0) return;
                          if (amount > remaining) {
                            Alert.alert('Monto inválido', 'No puede exceder el restante');
                            return;
                          }
                          const rec: PaymentRecord = {
                            amount: round2(amount),
                            date: new Date().toISOString().slice(0, 10),
                            timestamp: Date.now(),
                          };
                          setPaymentHistory((prev) => {
                            const next = { ...prev };
                            next[key] = [...(next[key] || []), rec];
                            return next;
                          });
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Expenses List */}
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
              Historial de Gastos
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
                {showForm ? 'Cancelar' : '+ Agregar'}
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
                Descripción
              </Text>
              <TextInput
                placeholder="Ej: Supermercado, gasolina, entradas"
                placeholderTextColor="#9CA3AF"
                value={formData.description}
                onChangeText={(t) => setFormData((f) => ({ ...f, description: t }))}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  color: '#111827',
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                Monto (CLP)
              </Text>
              <TextInput
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={formData.amount}
                onChangeText={(t) =>
                  setFormData((f) => ({ ...f, amount: t.replace(/[^0-9.]/g, '') }))
                }
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  color: '#111827',
                }}
              />

              {/* Who paid */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                ¿Quién pagó?
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {participants.map((p) => {
                  const active = formData.paid_by.includes(p.id);
                  return (
                    <TouchableOpacity
                      key={`payer-${p.id}`}
                      onPress={() =>
                        setFormData((f) => {
                          const exists = f.paid_by.includes(p.id);
                          return {
                            ...f,
                            paid_by: exists
                              ? f.paid_by.filter((id) => id !== p.id)
                              : [...f.paid_by, p.id],
                          };
                        })
                      }
                      style={{
                        backgroundColor: active ? '#2563EB' : 'white',
                        borderColor: active ? '#1D4ED8' : '#E5E7EB',
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? 'white' : '#111827',
                          fontSize: 12,
                          fontWeight: '600',
                        }}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Split between */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                ¿Entre quiénes se divide?
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {participants.map((p) => {
                  const active = formData.split_between.includes(p.id);
                  return (
                    <TouchableOpacity
                      key={`split-${p.id}`}
                      onPress={() =>
                        setFormData((f) => {
                          const exists = f.split_between.includes(p.id);
                          return {
                            ...f,
                            split_between: exists
                              ? f.split_between.filter((id) => id !== p.id)
                              : [...f.split_between, p.id],
                          };
                        })
                      }
                      style={{
                        backgroundColor: active ? '#059669' : 'white',
                        borderColor: active ? '#047857' : '#E5E7EB',
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? 'white' : '#111827',
                          fontSize: 12,
                          fontWeight: '600',
                        }}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={handleCreateExpense}
                style={{
                  backgroundColor: '#10B981',
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Registrar Gasto</Text>
              </TouchableOpacity>
            </View>
          )}

          {expenses && expenses.length > 0 ? (
            <View>
              {expenses.map((expense) => (
                <View
                  key={expense.id}
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
                        {expense.description}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                        Pagado por:{' '}
                        {(expense.paid_by || []).map((id) => getParticipantName(id)).join(', ')}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#3B82F6' }}>
                      {formatCurrency(expense.amount)}
                    </Text>
                  </View>

                  {/* Split info */}
                  <View
                    style={{
                      backgroundColor: '#F9FAFB',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{ fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 6 }}
                    >
                      Se divide entre:
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {expense.split_between?.map((personId) => (
                        <View
                          key={personId}
                          style={{
                            backgroundColor: '#DBEAFE',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                          }}
                        >
                          <Text style={{ fontSize: 11, color: '#1E40AF', fontWeight: '500' }}>
                            {getParticipantName(personId)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Delete button */}
                  <TouchableOpacity
                    onPress={() => handleDeleteExpense(expense.id)}
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
              <Text style={{ fontSize: 32, marginBottom: 8 }}>💸</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 }}>
                Sin gastos registrados
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                Comienza a registrar gastos compartidos del grupo
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};
