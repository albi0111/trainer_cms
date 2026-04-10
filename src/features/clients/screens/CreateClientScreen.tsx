import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { ScreenContainer } from '../../../shared/components/layout/ScreenContainer';
import { ClientCreationStepper } from '../components/ClientCreationStepper';
import { ClientStackParamList } from '../../../app/navigation/AppNavigator';
import { useClientFormStore } from '../../../store/useClientFormStore';
import { useClientStore } from '../../../store/useClientStore';

type CreateNav = StackNavigationProp<ClientStackParamList, 'CreateClient'>;

export const CreateClientScreen = () => {
  const navigation = useNavigation<CreateNav>();
  const { 
    formData, 
    resetForm, 
    startCreate 
  } = useClientFormStore();
  
  const { createClient, isSyncing } = useClientStore();

  useEffect(() => {
    startCreate();
  }, [startCreate]);

  const handleComplete = async () => {
    try {
      const { name, height_cm, weight_kg, ...profile } = formData;
      
      // 1. Create client (Optimistic UI handles reconciliation)
      createClient(name, profile as any);
      
      resetForm();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create client');
    }
  };

  const handleCancel = () => {
    resetForm();
    navigation.goBack();
  };

  return (
    <ScreenContainer scrollable={false}>
      <ClientCreationStepper 
        onComplete={handleComplete} 
        onCancel={handleCancel} 
        isSyncing={isSyncing}
      />
    </ScreenContainer>
  );
};
