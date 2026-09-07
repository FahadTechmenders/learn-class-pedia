export const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export const getFullName = (lead) => {
  if (!lead) return '';
  if (hasValue(lead.customerName)) return lead.customerName.trim();
  return `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim();
};

export const getInitials = (lead) => {
  if (!lead) return '';
  const first = lead.firstName?.trim()?.[0];
  const last = lead.lastName?.trim()?.[0];
  if (first || last) return `${first ?? ''}${last ?? ''}`.toUpperCase();
  const name = getFullName(lead);
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
};

const parseDate = (value) => {
  if (!hasValue(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return null;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatTime = (value) => {
  const date = parseDate(value);
  if (!date) return null;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export const formatDateTime = (value) => {
  const date = formatDate(value);
  const time = formatTime(value);
  if (!date) return null;
  return `${date}, ${time}`;
};

export const formatUrlLabel = (url) => {
  if (!hasValue(url)) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
    return `${host}${path}`;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  }
};

export const getVerificationStatus = (isVerified) => ({
  verified: Boolean(isVerified),
  label: isVerified ? 'Verified' : 'Pending verification',
});

export const getAccountStatus = (isActive) => ({
  active: Boolean(isActive),
  label: isActive ? 'Active' : 'Inactive',
});

export const QUESTION_TYPE = {
  SINGLE_CHOICE: 1,
  MULTIPLE_CHOICE: 2,
  TEXT: 3,
};

export const sortAnswers = (answers) => {
  if (!Array.isArray(answers)) return [];
  return [...answers].sort((a, b) => (a.questionOrder ?? 0) - (b.questionOrder ?? 0));
};

export const getAnswerContent = (answer) => {
  if (!answer) return { type: 'empty', values: [] };
  const choices = Array.isArray(answer.answers) ? answer.answers.filter(hasValue) : [];
  const text = hasValue(answer.answerText) ? answer.answerText.trim() : null;

  switch (answer.questionTypeId) {
    case QUESTION_TYPE.SINGLE_CHOICE:
      return { type: 'single', values: choices.slice(0, 1), text };
    case QUESTION_TYPE.MULTIPLE_CHOICE:
      return { type: 'multiple', values: choices, text };
    case QUESTION_TYPE.TEXT:
      return { type: 'text', values: [], text };
    default:
      if (choices.length > 1) return { type: 'multiple', values: choices, text };
      if (choices.length === 1) return { type: 'single', values: choices, text };
      return { type: 'text', values: [], text };
  }
};

export const getInitialsFromName = (name) => {
  if (!hasValue(name)) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const mapLead = (lead) => ({
  id: lead.customerId,
  name: hasValue(lead.customerName) ? lead.customerName.trim() : 'Unnamed lead',
  initials: getInitialsFromName(lead.customerName),
  email: hasValue(lead.email) ? lead.email : null,
  phone: hasValue(lead.phone) ? lead.phone : null,
  institute: hasValue(lead.institute) ? lead.institute : null,
  customerTypeId: lead.customerTypeId ?? null,
  customerType: hasValue(lead.customerType) ? lead.customerType : null,
  customerTypeDescription: hasValue(lead.customerTypeDescription) ? lead.customerTypeDescription : null,
  country: hasValue(lead.country) ? lead.country : null,
  signupType: hasValue(lead.signupType) ? lead.signupType : null,
  emailVerified: Boolean(lead.isEmailVerified),
  phoneVerified: Boolean(lead.isPhoneVerified),
  active: Boolean(lead.isActive),
  signupDate: formatDate(lead.signupDate),
  signupTime: formatTime(lead.signupDate),
});

export const getPageRange = (page, pageSize, totalRecords) => {
  if (!totalRecords) return { start: 0, end: 0 };
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRecords);
  return { start, end };
};

export const JOURNEY_STATUS = {
  COMPLETED: 'completed',
  CURRENT: 'current',
  PENDING: 'pending',
  MUTED: 'muted',
};

/**
 * Builds the 5-step journey purely from API fields:
 * referralUrl, landingPageUrl, signupType, signupDate, isEmailVerified, isPhoneVerified, isActive.
 */
export const buildLeadJourney = (lead) => {
  if (!lead) return [];

  const referral = formatUrlLabel(lead.referralUrl);
  const landing = formatUrlLabel(lead.landingPageUrl);
  const signupDate = formatDate(lead.signupDate);
  const signupDateTime = formatDateTime(lead.signupDate);
  const emailVerified = Boolean(lead.isEmailVerified);
  const phoneVerified = Boolean(lead.isPhoneVerified);
  const verified = emailVerified || phoneVerified;
  const fullyVerified = emailVerified && phoneVerified;
  const active = Boolean(lead.isActive);

  const steps = [
    {
      key: 'referral',
      stage: 'Referral',
      title: referral || 'Direct',
      value: referral ? 'Referral source' : 'No referral recorded',
      status: referral ? JOURNEY_STATUS.COMPLETED : JOURNEY_STATUS.MUTED,
      href: referral ? lead.referralUrl : null,
      details: [
        { label: 'Source', value: referral || 'Not recorded' },
        referral ? { label: 'URL', value: lead.referralUrl, href: lead.referralUrl } : null,
      ].filter(Boolean),
    },
    {
      key: 'landing',
      stage: 'Landing Page',
      title: landing || 'Unknown page',
      value: landing ? 'First page visited' : 'No landing page recorded',
      status: landing ? JOURNEY_STATUS.COMPLETED : JOURNEY_STATUS.MUTED,
      href: landing ? lead.landingPageUrl : null,
      details: [
        { label: 'Page', value: landing || 'Not recorded' },
        landing ? { label: 'URL', value: lead.landingPageUrl, href: lead.landingPageUrl } : null,
      ].filter(Boolean),
    },
    {
      key: 'signup',
      stage: 'Signup',
      title: hasValue(lead.signupType) ? `${lead.signupType} Signup` : 'Signup',
      value: signupDate || 'Registered',
      status: JOURNEY_STATUS.COMPLETED,
      details: [
        { label: 'Signed up', value: signupDateTime || 'Unknown' },
        { label: 'Signup method', value: hasValue(lead.signupType) ? lead.signupType : 'Not specified' },
      ],
    },
    {
      key: 'verification',
      stage: 'Verification',
      title: fullyVerified ? 'Verified' : verified ? 'Partially Verified' : 'Verification Pending',
      value: fullyVerified ? 'Email & phone verified' : verified ? (emailVerified ? 'Email verified' : 'Phone verified') : 'Awaiting verification',
      status: fullyVerified ? JOURNEY_STATUS.COMPLETED : JOURNEY_STATUS.PENDING,
      details: [
        { label: 'Email', value: emailVerified ? 'Verified' : 'Pending' },
        { label: 'Phone', value: phoneVerified ? 'Verified' : 'Pending' },
      ],
    },
    {
      key: 'account',
      stage: 'Account',
      title: active ? 'Active Account' : 'Inactive Account',
      value: 'ClassPedia LMS',
      status: active ? JOURNEY_STATUS.COMPLETED : JOURNEY_STATUS.MUTED,
      details: [
        { label: 'Status', value: active ? 'Active' : 'Inactive' },
        { label: 'Customer ID', value: `#${lead.customerId}` },
      ],
    },
  ];

  // Current step: the first unresolved stage after signup, otherwise the account stage.
  const currentKey = !fullyVerified ? 'verification' : 'account';
  return steps.map((step, index) => ({
    ...step,
    index,
    number: String(index + 1).padStart(2, '0'),
    isCurrent: step.key === currentKey,
  }));
};
