import { EMAIL_FOLDERS, EMAIL_LABELS, EMAIL_PRIORITY, EMAIL_STATUS } from '../constants/emailConstants';

export const mockUsers = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    avatar: 'https://i.pravatar.cc/150?img=1',
    role: 'Product Manager'
  },
  {
    id: 2,
    name: 'Michael Chen',
    email: 'michael.chen@techcorp.com',
    avatar: 'https://i.pravatar.cc/150?img=2',
    role: 'Senior Developer'
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@startup.io',
    avatar: 'https://i.pravatar.cc/150?img=3',
    role: 'UX Designer'
  },
  {
    id: 4,
    name: 'David Kim',
    email: 'david.kim@enterprise.com',
    avatar: 'https://i.pravatar.cc/150?img=4',
    role: 'Engineering Manager'
  },
  {
    id: 5,
    name: 'Lisa Anderson',
    email: 'lisa.anderson@agency.com',
    avatar: 'https://i.pravatar.cc/150?img=5',
    role: 'Marketing Director'
  },
  {
    id: 6,
    name: 'James Wilson',
    email: 'james.wilson@consulting.com',
    avatar: 'https://i.pravatar.cc/150?img=6',
    role: 'Business Analyst'
  },
  {
    id: 7,
    name: 'Maria Garcia',
    email: 'maria.garcia@design.studio',
    avatar: 'https://i.pravatar.cc/150?img=7',
    role: 'Creative Director'
  },
  {
    id: 8,
    name: 'Robert Taylor',
    email: 'robert.taylor@finance.com',
    avatar: 'https://i.pravatar.cc/150?img=8',
    role: 'CFO'
  },
  {
    id: 9,
    name: 'Jennifer Lee',
    email: 'jennifer.lee@hr.company.com',
    avatar: 'https://i.pravatar.cc/150?img=9',
    role: 'HR Manager'
  },
  {
    id: 10,
    name: 'Thomas Brown',
    email: 'thomas.brown@sales.com',
    avatar: 'https://i.pravatar.cc/150?img=10',
    role: 'Sales Director'
  }
];

export const mockEmails = [
  {
    id: 'email-1',
    threadId: 'thread-1',
    from: mockUsers[0],
    to: [{ name: 'You', email: 'you@company.com' }],
    cc: [],
    bcc: [],
    subject: 'Q4 Product Roadmap Review - Action Items',
    preview: 'Hi team, Following up on our roadmap meeting yesterday. Here are the key action items we discussed...',
    body: `<p>Hi team,</p>
    <p>Following up on our roadmap meeting yesterday. Here are the key action items we discussed:</p>
    <ul>
      <li>Finalize feature specifications by end of week</li>
      <li>Schedule design review sessions with stakeholders</li>
      <li>Update timeline estimates in project management tool</li>
      <li>Prepare presentation for executive review next Monday</li>
    </ul>
    <p>Please let me know if you have any questions or concerns.</p>
    <p>Best regards,<br/>Sarah</p>`,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    starred: true,
    important: true,
    labels: [EMAIL_LABELS.WORK.id, EMAIL_LABELS.URGENT.id],
    folder: EMAIL_FOLDERS.INBOX,
    priority: EMAIL_PRIORITY.HIGH,
    hasAttachments: true,
    attachments: [
      {
        id: 'att-1',
        name: 'Q4_Roadmap_Draft.pdf',
        size: 2456789,
        type: 'application/pdf',
        url: '#'
      },
      {
        id: 'att-2',
        name: 'Action_Items.xlsx',
        size: 156789,
        type: 'application/vnd.ms-excel',
        url: '#'
      }
    ]
  },
  {
    id: 'email-2',
    threadId: 'thread-2',
    from: mockUsers[1],
    to: [{ name: 'You', email: 'you@company.com' }],
    cc: [mockUsers[3]],
    bcc: [],
    subject: 'Code Review Request: Authentication Module',
    preview: 'Hey, I\'ve completed the new authentication module implementation. Could you review the PR when you get a chance?',
    body: `<p>Hey,</p>
    <p>I've completed the new authentication module implementation. Could you review the PR when you get a chance?</p>
    <p>Key changes:</p>
    <ul>
      <li>Implemented JWT-based authentication</li>
      <li>Added refresh token mechanism</li>
      <li>Enhanced security with rate limiting</li>
      <li>Updated unit tests with 95% coverage</li>
    </ul>
    <p>PR Link: <a href="#">github.com/company/project/pull/1234</a></p>
    <p>Thanks!<br/>Michael</p>`,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: false,
    starred: false,
    important: false,
    labels: [EMAIL_LABELS.WORK.id],
    folder: EMAIL_FOLDERS.INBOX,
    priority: EMAIL_PRIORITY.NORMAL,
    hasAttachments: false,
    attachments: []
  },
  {
    id: 'email-3',
    threadId: 'thread-3',
    from: mockUsers[2],
    to: [{ name: 'You', email: 'you@company.com' }],
    cc: [],
    bcc: [],
    subject: 'New Design System Components Ready for Review',
    preview: 'Hi! The new design system components are ready. I\'ve created a Figma file with all the updated components...',
    body: `<p>Hi!</p>
    <p>The new design system components are ready. I've created a Figma file with all the updated components and documentation.</p>
    <p>What's new:</p>
    <ul>
      <li>Updated button variants with new color palette</li>
      <li>New card components with elevation system</li>
      <li>Enhanced form inputs with better accessibility</li>
      <li>Icon library expanded to 500+ icons</li>
    </ul>
    <p>Figma Link: <a href="#">figma.com/file/design-system</a></p>
    <p>Let me know your thoughts!</p>
    <p>Emily</p>`,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    read: true,
    starred: true,
    important: false,
    labels: [EMAIL_LABELS.WORK.id],
    folder: EMAIL_FOLDERS.INBOX,
    priority: EMAIL_PRIORITY.NORMAL,
    hasAttachments: true,
    attachments: [
      {
        id: 'att-3',
        name: 'Design_System_Preview.png',
        size: 3456789,
        type: 'image/png',
        url: '#'
      }
    ]
  },
  {
    id: 'email-4',
    threadId: 'thread-4',
    from: mockUsers[3],
    to: [{ name: 'You', email: 'you@company.com' }],
    cc: [mockUsers[0], mockUsers[1]],
    bcc: [],
    subject: 'Team Performance Review - Q3 Results',
    preview: 'Team, I wanted to share the Q3 performance metrics. Overall, we\'ve exceeded our targets in most areas...',
    body: `<p>Team,</p>
    <p>I wanted to share the Q3 performance metrics. Overall, we've exceeded our targets in most areas:</p>
    <ul>
      <li>Sprint velocity increased by 25%</li>
      <li>Bug resolution time reduced by 40%</li>
      <li>Customer satisfaction score: 4.8/5</li>
      <li>On-time delivery rate: 92%</li>
    </ul>
    <p>Great work everyone! Let's keep this momentum going into Q4.</p>
    <p>Best,<br/>David</p>`,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    starred: false,
    important: false,
    labels: [EMAIL_LABELS.WORK.id],
    folder: EMAIL_FOLDERS.INBOX,
    priority: EMAIL_PRIORITY.NORMAL,
    hasAttachments: true,
    attachments: [
      {
        id: 'att-4',
        name: 'Q3_Performance_Report.pdf',
        size: 1234567,
        type: 'application/pdf',
        url: '#'
      }
    ]
  },
  {
    id: 'email-5',
    threadId: 'thread-5',
    from: mockUsers[4],
    to: [{ name: 'You', email: 'you@company.com' }],
    cc: [],
    bcc: [],
    subject: 'Marketing Campaign Launch - Next Week',
    preview: 'Hi! Just a heads up that we\'re launching the new marketing campaign next Monday. Here\'s what you need to know...',
    body: `<p>Hi!</p>
    <p>Just a heads up that we're launching the new marketing campaign next Monday. Here's what you need to know:</p>
    <ul>
      <li>Campaign goes live at 9 AM EST</li>
      <li>Social media posts scheduled across all platforms</li>
      <li>Email blast to 50K subscribers</li>
      <li>Landing page is ready and tested</li>
    </ul>
    <p>Please review the campaign materials and let me know if you have any feedback.</p>
    <p>Thanks,<br/>Lisa</p>`,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: false,
    starred: false,
    important: true,
    labels: [EMAIL_LABELS.WORK.id, EMAIL_LABELS.MEETING.id],
    folder: EMAIL_FOLDERS.INBOX,
    priority: EMAIL_PRIORITY.HIGH,
    hasAttachments: false,
    attachments: []
  },
  {
    id: 'email-6',
    threadId: 'thread-6',
    from: mockUsers[5],
    to: [{ name: 'You', email: 'you@company.com' }],
    cc: [],
    bcc: [],
    subject: 'Client Meeting Notes - ABC Corporation',
    preview: 'Following up on today\'s client meeting. Here are my notes and action items...',
    body: `<p>Hi,</p>
    <p>Following up on today's client meeting. Here are my notes and action items:</p>
    <p><strong>Key Discussion Points:</strong></p>
    <ul>
      <li>Budget approval for Phase 2: Confirmed</li>
      <li>Timeline extension requested: 2 weeks</li>
      <li>Additional features requested: User analytics dashboard</li>
    </ul>
    <p><strong>Next Steps:</strong></p>
    <ul>
      <li>Update project timeline by Friday</li>
      <li>Prepare analytics dashboard mockups</li>
      <li>Schedule follow-up meeting for next week</li>
    </ul>
    <p>Best,<br/>James</p>`,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    starred: true,
    important: false,
    labels: [EMAIL_LABELS.WORK.id, EMAIL_LABELS.FOLLOW_UP.id],
    folder: EMAIL_FOLDERS.INBOX,
    priority: EMAIL_PRIORITY.NORMAL,
    hasAttachments: false,
    attachments: []
  },
  {
    id: 'email-7',
    threadId: 'thread-7',
    from: mockUsers[6],
    to: [{ name: 'You', email: 'you@company.com' }],
    cc: [],
    bcc: [],
    subject: 'Brand Refresh Proposal',
    preview: 'Hey! I\'ve put together a proposal for the brand refresh project. Would love to get your thoughts...',
    body: `<p>Hey!</p>
    <p>I've put together a proposal for the brand refresh project. Would love to get your thoughts on the direction.</p>
    <p><strong>Proposal Highlights:</strong></p>
    <ul>
      <li>Modern, minimalist logo design</li>
      <li>Updated color palette with accessibility in mind</li>
      <li>New typography system</li>
      <li>Comprehensive brand guidelines</li>
    </ul>
    <p>I've attached the full proposal deck. Let's schedule a call to discuss!</p>
    <p>Cheers,<br/>Maria</p>`,
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    starred: false,
    important: false,
    labels: [EMAIL_LABELS.WORK.id],
    folder: EMAIL_FOLDERS.INBOX,
    priority: EMAIL_PRIORITY.NORMAL,
    hasAttachments: true,
    attachments: [
      {
        id: 'att-5',
        name: 'Brand_Refresh_Proposal.pdf',
        size: 5678901,
        type: 'application/pdf',
        url: '#'
      },
      {
        id: 'att-6',
        name: 'Logo_Concepts.zip',
        size: 12345678,
        type: 'application/zip',
        url: '#'
      }
    ]
  },
  {
    id: 'email-8',
    threadId: 'thread-8',
    from: mockUsers[7],
    to: [{ name: 'You', email: 'you@company.com' }],
    cc: [mockUsers[8]],
    bcc: [],
    subject: 'Budget Approval Request - Q4 Initiatives',
    preview: 'I need your approval for the Q4 budget allocation. Please review the attached spreadsheet...',
    body: `<p>Hi,</p>
    <p>I need your approval for the Q4 budget allocation. Please review the attached spreadsheet and let me know if you have any questions.</p>
    <p><strong>Budget Breakdown:</strong></p>
    <ul>
      <li>Engineering: $250K</li>
      <li>Marketing: $150K</li>
      <li>Operations: $100K</li>
      <li>Contingency: $50K</li>
    </ul>
    <p>Total: $550K</p>
    <p>Please approve by end of week so we can proceed with planning.</p>
    <p>Thanks,<br/>Robert</p>`,
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    read: false,
    starred: true,
    important: true,
    labels: [EMAIL_LABELS.WORK.id, EMAIL_LABELS.URGENT.id],
    folder: EMAIL_FOLDERS.INBOX,
    priority: EMAIL_PRIORITY.HIGH,
    hasAttachments: true,
    attachments: [
      {
        id: 'att-7',
        name: 'Q4_Budget_Breakdown.xlsx',
        size: 234567,
        type: 'application/vnd.ms-excel',
        url: '#'
      }
    ]
  },
  {
    id: 'email-9',
    threadId: 'thread-9',
    from: mockUsers[8],
    to: [{ name: 'You', email: 'you@company.com' }],
    cc: [],
    bcc: [],
    subject: 'New Employee Onboarding - Welcome Package',
    preview: 'Welcome to the team! Here\'s everything you need to know to get started...',
    body: `<p>Welcome to the team!</p>
    <p>Here's everything you need to know to get started:</p>
    <p><strong>First Week Schedule:</strong></p>
    <ul>
      <li>Monday: Orientation and team introductions</li>
      <li>Tuesday: IT setup and system access</li>
      <li>Wednesday: Department overview meetings</li>
      <li>Thursday: Training sessions</li>
      <li>Friday: One-on-one with your manager</li>
    </ul>
    <p>I've attached your welcome package with all the details. Looking forward to working with you!</p>
    <p>Best regards,<br/>Jennifer</p>`,
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    starred: false,
    important: false,
    labels: [EMAIL_LABELS.WORK.id],
    folder: EMAIL_FOLDERS.INBOX,
    priority: EMAIL_PRIORITY.NORMAL,
    hasAttachments: true,
    attachments: [
      {
        id: 'att-8',
        name: 'Welcome_Package.pdf',
        size: 3456789,
        type: 'application/pdf',
        url: '#'
      }
    ]
  },
  {
    id: 'email-10',
    threadId: 'thread-10',
    from: mockUsers[9],
    to: [{ name: 'You', email: 'you@company.com' }],
    cc: [],
    bcc: [],
    subject: 'Sales Pipeline Update - October',
    preview: 'Quick update on the sales pipeline for October. We\'re tracking well against our targets...',
    body: `<p>Hi,</p>
    <p>Quick update on the sales pipeline for October. We're tracking well against our targets:</p>
    <ul>
      <li>New leads: 45 (up 20% from last month)</li>
      <li>Qualified opportunities: 28</li>
      <li>Closed deals: 12 ($450K in revenue)</li>
      <li>Pipeline value: $1.2M</li>
    </ul>
    <p>Key wins this month include landing ABC Corp and XYZ Industries. Full report attached.</p>
    <p>Best,<br/>Thomas</p>`,
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    starred: false,
    important: false,
    labels: [EMAIL_LABELS.WORK.id],
    folder: EMAIL_FOLDERS.INBOX,
    priority: EMAIL_PRIORITY.NORMAL,
    hasAttachments: true,
    attachments: [
      {
        id: 'att-9',
        name: 'October_Sales_Report.pdf',
        size: 1234567,
        type: 'application/pdf',
        url: '#'
      }
    ]
  },
  {
    id: 'email-11',
    threadId: 'thread-11',
    from: { name: 'You', email: 'you@company.com' },
    to: [mockUsers[0]],
    cc: [],
    bcc: [],
    subject: 'Re: Q4 Product Roadmap Review - Action Items',
    preview: 'Thanks for the summary! I\'ll have the feature specs ready by Thursday...',
    body: `<p>Hi Sarah,</p>
    <p>Thanks for the summary! I'll have the feature specs ready by Thursday. I've already started working on the timeline updates.</p>
    <p>Quick question about the executive presentation - do you want me to focus on technical details or keep it high-level?</p>
    <p>Thanks,<br/>You</p>`,
    timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    starred: false,
    important: false,
    labels: [EMAIL_LABELS.WORK.id],
    folder: EMAIL_FOLDERS.SENT,
    priority: EMAIL_PRIORITY.NORMAL,
    hasAttachments: false,
    attachments: []
  },
  {
    id: 'email-12',
    threadId: 'thread-12',
    from: { name: 'You', email: 'you@company.com' },
    to: [mockUsers[1]],
    cc: [],
    bcc: [],
    subject: 'Draft: Weekend Plans',
    preview: 'Hey Michael, Are you free this weekend? I was thinking we could...',
    body: `<p>Hey Michael,</p>
    <p>Are you free this weekend? I was thinking we could grab coffee and discuss the new project ideas.</p>
    <p>Let me know what works for you!</p>`,
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    read: false,
    starred: false,
    important: false,
    labels: [EMAIL_LABELS.PERSONAL.id],
    folder: EMAIL_FOLDERS.DRAFTS,
    priority: EMAIL_PRIORITY.NORMAL,
    hasAttachments: false,
    attachments: []
  }
];

export const mockFolderCounts = {
  [EMAIL_FOLDERS.INBOX]: 10,
  [EMAIL_FOLDERS.SENT]: 45,
  [EMAIL_FOLDERS.DRAFTS]: 3,
  [EMAIL_FOLDERS.SPAM]: 12,
  [EMAIL_FOLDERS.TRASH]: 8,
  [EMAIL_FOLDERS.STARRED]: 5,
  [EMAIL_FOLDERS.IMPORTANT]: 4,
  [EMAIL_FOLDERS.ALL]: 83
};
