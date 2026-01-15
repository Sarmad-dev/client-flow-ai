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
    canAddTeamMember,
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

  const checkAndShowModalAsync = async (
    feature: string,
    check: () => Promise<boolean>
  ): Promise<boolean> => {
    const result = await check();
    if (!result) {
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

  const guardAddTeamMember = async (
    organizationId: string
  ): Promise<boolean> => {
    return checkAndShowModalAsync('Add Team Member', () =>
      canAddTeamMember(organizationId)
    );
  };

  const guardTaskCreation = async (projectId: string): Promise<boolean> => {
    return checkAndShowModalAsync('Task Creation', () =>
      canCreateTask(projectId)
    );
  };

  const guardProjectCreation = (): boolean => {
    return checkAndShowModal('Project Creation', canCreateProject);
  };

  const guardEmailSending = (): boolean => {
    return checkAndShowModal('Email Sending', canSendEmail);
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
    guardAddTeamMember,

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
    canAddTeamMember,
  };
};
