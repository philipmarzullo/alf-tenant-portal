import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useTenantPortal } from '../../contexts/TenantPortalContext';
import { useTenantId } from '../../contexts/TenantIdContext';
import { getFreshToken } from '../../lib/supabase';
import { getDefaultDepartments, getDefaultServiceCategories, getDefaultDifferentiators } from '../../data/onboardingDefaults';

import OnboardingShell from './OnboardingShell';
import OnboardingProgressBar from './OnboardingProgressBar';
import WelcomeScreen from './WelcomeScreen';
import CompanyBasicsStep from './CompanyBasicsStep';
import DepartmentsStep from './DepartmentsStep';
import ServicesStep from './ServicesStep';
import DifferentiatorsStep from './DifferentiatorsStep';
import ReviewStep from './ReviewStep';
import PortalGeneratingScreen from './PortalGeneratingScreen';
import PortalReadyScreen from './PortalReadyScreen';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const INITIAL_FORM = {
  industry: '',
  companyDescription: '',
  employeeCount: '',
  headquarters: '',
  ownershipModel: '',
  foundedYear: '',
  departments: [],
  serviceCategories: [],
  differentiators: [],
};

export default function OnboardingPage() {
  const { companyProfile, profileStatus, refreshAll } = useTenantPortal();
  const { tenantId } = useTenantId();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [confirming, setConfirming] = useState(false);
  const [prevIndustry, setPrevIndustry] = useState('');

  // Guard: if profile is already confirmed, redirect to portal
  if (profileStatus && profileStatus !== 'draft') {
    return <Navigate to="/" replace />;
  }

  // Pre-populate from existing draft profile (template-created tenants)
  useEffect(() => {
    if (companyProfile && companyProfile.status === 'draft') {
      setFormData(prev => ({
        ...prev,
        industry: companyProfile.industry || prev.industry,
        companyDescription: companyProfile.company_description || prev.companyDescription,
        employeeCount: companyProfile.employee_count || prev.employeeCount,
        headquarters: companyProfile.headquarters || prev.headquarters,
        ownershipModel: companyProfile.ownership_model || prev.ownershipModel,
        foundedYear: companyProfile.founded_year || prev.foundedYear,
        departments: companyProfile.departments?.length ? companyProfile.departments : prev.departments,
        serviceCategories: companyProfile.service_catalog?.length ? companyProfile.service_catalog : prev.serviceCategories,
        differentiators: companyProfile.differentiators?.length ? companyProfile.differentiators : prev.differentiators,
      }));
      setPrevIndustry(companyProfile.industry || '');
    }
  }, []); // Only on mount

  const updateField = useCallback((key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // When industry changes on Step 1, pre-populate defaults for later steps
  // (only if those arrays are currently empty)
  function handleIndustryChange(value) {
    updateField('industry', value);
    if (value && value !== prevIndustry) {
      setPrevIndustry(value);
      setFormData(prev => ({
        ...prev,
        industry: value,
        departments: prev.departments.length === 0 ? getDefaultDepartments(value) : prev.departments,
        serviceCategories: prev.serviceCategories.length === 0 ? getDefaultServiceCategories(value) : prev.serviceCategories,
        differentiators: prev.differentiators.length === 0 ? getDefaultDifferentiators(value) : prev.differentiators,
      }));
    }
  }

  // Wrap onChange for step 1 to intercept industry changes
  function handleStep1Change(key, value) {
    if (key === 'industry') {
      handleIndustryChange(value);
    } else {
      updateField(key, value);
    }
  }

  // Save profile draft on each "Next" (fire-and-forget)
  async function saveProfileDraft() {
    if (!tenantId) return;
    try {
      const token = await getFreshToken();
      if (!token) return;

      await fetch(`${BACKEND_URL}/api/company-profile/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          industry: formData.industry,
          company_description: formData.companyDescription,
          employee_count: formData.employeeCount,
          headquarters: formData.headquarters,
          ownership_model: formData.ownershipModel,
          founded_year: formData.foundedYear,
          departments: formData.departments,
          service_catalog: formData.serviceCategories,
          differentiators: formData.differentiators,
        }),
      });
    } catch (err) {
      console.warn('[Onboarding] Draft save failed:', err.message);
    }
  }

  function handleNext() {
    if (step >= 1 && step <= 4) {
      saveProfileDraft(); // fire-and-forget
    }
    setStep(prev => prev + 1);
  }

  function handleBack() {
    setStep(prev => Math.max(0, prev - 1));
  }

  function handleEdit(stepNum) {
    setStep(stepNum);
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      // Final save of all data
      await saveProfileDraft();

      // PATCH status to confirmed — triggers portal generation
      const token = await getFreshToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${BACKEND_URL}/api/company-profile/${tenantId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to confirm profile');
      }

      setStep(6); // Move to generating screen
    } catch (err) {
      console.error('[Onboarding] Confirm error:', err.message);
      setConfirming(false);
    }
  }

  async function handleGenerationComplete() {
    await refreshAll(); // Refresh portal data (workspaces, tools, etc.)
    setStep(7); // Move to ready screen
  }

  // Determine content based on step
  function renderStep() {
    switch (step) {
      case 0:
        return <WelcomeScreen onNext={handleNext} />;
      case 1:
        return (
          <CompanyBasicsStep
            data={formData}
            onChange={handleStep1Change}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <DepartmentsStep
            data={formData}
            onChange={updateField}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <ServicesStep
            data={formData}
            onChange={updateField}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <DifferentiatorsStep
            data={formData}
            onChange={updateField}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <ReviewStep
            data={formData}
            onEdit={handleEdit}
            onConfirm={handleConfirm}
            onBack={handleBack}
            confirming={confirming}
          />
        );
      case 6:
        return <PortalGeneratingScreen onComplete={handleGenerationComplete} />;
      case 7:
        return <PortalReadyScreen />;
      default:
        return <WelcomeScreen onNext={handleNext} />;
    }
  }

  const showProgress = step >= 1 && step <= 5;

  return (
    <OnboardingShell maxWidth={step === 0 || step >= 6 ? 'max-w-lg' : 'max-w-2xl'}>
      {showProgress && <OnboardingProgressBar currentStep={step} />}
      {renderStep()}
    </OnboardingShell>
  );
}
