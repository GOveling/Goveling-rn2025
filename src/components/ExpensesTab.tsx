import React, { useState } from 'react';

import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useSupabaseTripExpenses, type TripExpense } from '~/hooks/useSupabaseTripExpenses';

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
    paid_by: [] as string[],
    split_between: participants.map((p) => p.id),
  });

  // Get participant name by ID
  const getParticipantName = (id: string) => {
    return participants.find((p) => p.id === id)?.name || 'Unknown';
  };

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

  // Calculate who paid what
  const calculateBalance = () => {
    const balance: Record<string, number> = {};

    participants.forEach((p) => {
      balance[p.id] = 0;
    });

    if (!expenses || expenses.length === 0) return balance;

    expenses.forEach((expense) => {
      const paidByLength = expense.paid_by?.length || 1;
      const splitBetween = expense.split_between?.length || participants.length;

      // Add to those who paid
      expense.paid_by?.forEach((payerId) => {
        balance[payerId] = (balance[payerId] || 0) + expense.amount;
      });

      // Subtract from those who should split
      expense.split_between?.forEach((personId) => {
        const perPerson = expense.amount / splitBetween;
        balance[personId] = (balance[personId] || 0) - perPerson;
      });
    });

    return balance;
  };

  const balance = calculateBalance();

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
                const userBalance = balance[participant.id] || 0;
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
              {/* Note: This is a simplified version. In a full app, you'd use TextInput */}
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
                Monto (CLP)
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
                        Pagado por: {getParticipantName(expense.paid_by?.[0] || '')}
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
