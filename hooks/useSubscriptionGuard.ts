import { useState } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';

export const useSubscriptionGuard = () => {
  const {
    canCreateLead,
    canCreateClient,
    canCreateTask,
    canCreateProject,
    canSendEmail,
    canAccessMeetings,
    canAccessAnalytics,
    userSubscription,
  } = useSubscription();

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [modalFeatureName, setModalFeatureName] = useState('Pro Feature');

  const checkAndShowModal = (
    feature: string,
    check: () => boolean
  ): boolean => {
    if (!check()) {
      setModalFeatureName(feature);
      setShowSubscriptionModal(true);
      return false;
    }
    return true;
  };

  const guardLeadCreation = (): boolean => {
    return checkAndShowModal('Lead Creation', canCreateLead);
  };

  const guardClientCreation = (): boolean => {
    return checkAndShowModal('Client Creation', canCreateClient);
  };

  const guardTaskCreation = (clientId: string): boolean => {
    return checkAndShowModal('Task Creation', () => canCreateTask(clientId));
  };

  const guardProjectCreation = (): boolean => {
    return checkAndShowModal('Project Creation', canCreateProject);
  };

  const guardEmailSending = (type: 'client' | 'lead', id: string): boolean => {
    return checkAndShowModal('Email Sending', () => canSendEmail(type, id));
  };

  const guardMeetingsAccess = (): boolean => {
    return checkAndShowModal('Meeting Management', canAccessMeetings);
  };

  const guardAnalyticsAccess = (): boolean => {
    return checkAndShowModal('Email Analytics', canAccessAnalytics);
  };

  return {
    // Guard functions
    guardLeadCreation,
    guardClientCreation,
    guardTaskCreation,
    guardProjectCreation,
    guardEmailSending,
    guardMeetingsAccess,
    guardAnalyticsAccess,

    // Modal control
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,

    // Direct access to subscription state
    userSubscription,
    canCreateLead,
    canCreateClient,
    canCreateTask,
    canCreateProject,
    canSendEmail,
    canAccessMeetings,
    canAccessAnalytics,
  };
};
