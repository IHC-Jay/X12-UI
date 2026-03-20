export interface HelpContent {
  title: string;
  overview: string;
  quickSteps: string[];
  tips: string[];
}

export const DEFAULT_HELP_CONTENT: HelpContent = {
  title: 'Screen Help',
  overview: 'Use this screen to view and manage data for the selected workflow.',
  quickSteps: [
    'Review required inputs on the page.',
    'Run the primary action for this screen (search/save/compare).',
    'Use filters or detail links to refine results.'
  ],
  tips: [
    'Use Settings to personalize defaults.',
    'Open related detail pages from result tables.'
  ]
};

export const HELP_CONTENT_BY_ROUTE: Array<{ routePrefix: string; content: HelpContent }> = [
  {
    routePrefix: '/dashboard',
    content: {
      title: 'Dashboard Help',
      overview: 'Dashboard shows high-level activity and quick status indicators.',
      quickSteps: [
        'Review summary cards and counts.',
        'Use links from dashboard widgets to navigate to details.',
        'Refresh page data by revisiting the tab when needed.'
      ],
      tips: ['Use this as your entry point to major workflows.']
    }
  },
  {
    routePrefix: '/summary',
    content: {
      title: 'Transmissions Help',
      overview: 'Transmissions lets you review transmission-level (ISA-IEA) activity and statuses.',
      quickSteps: [
        'Only transmissions with the selected date/status are included.',
        'Right-Click transmission rows for further details or to view raw X12.'
      ],
      tips: ['Start broad, then narrow with filters.',
      'Results can be exported to a file.']
    }
  },
  {
    routePrefix: '/transaction/transaction-settings',
    content: {
      title: 'Transaction Settings Help',
      overview: 'This screen has two setup areas: Default User configuration on the left to set the landing page, default transaction/mode, time windows, row count, auto logout.  Transaction columns on the right set display/search fields by transaction and mode.',
      quickSteps: [
        'Update User Configuration values and click Save Configuration.',
        'Select a transaction and mode, then click and drag fields between Available and Selected lists to enable or disable search or visibilty, respectively',
        'Click Save For Session for temporary changes, Save As Defaults for change to persist across sessions.'
      ],
      tips: [
        'Batch and Realtime settings are configured separately.',
        'Use Reset Settings to restore back to default.'
      ]
    }
  },
  {
    routePrefix: '/transaction/transaction-details',
    content: {
      title: 'Transaction Details Help',
      overview: 'Displays detailed information for a single transaction.',
      quickSteps: [
        'Raw X12 is for the transaction is shown at the bottom (scroll down).',
        'Also at the bottom are buttons to display full X12 (ISA-IEA), or to access the results this transaction generated.'
      ],
      tips: ['In most browsers, ctrl-f can be used to search for a given heading or value.']
    }
  },
  {
    routePrefix: '/transaction',
    content: {
      title: 'Transactions Help',
      overview: 'View transaction by timestamp, mode, and transaction type.',
      quickSteps: [
        'Right-click a transaction to view transaction contents, transaction responses, and/or display raw X12.',
        'Batch/RealTime selection only available for relevant transaction types.',
        'Sort columns by clicking on column headers.'
      ],
      tips: ['Available search fields and data columns can be configured in the Settings tab','This data can be exported to file.']
    }
  },
  {
    routePrefix: '/workflow/workflowDetails',
    content: {
      title: 'Workflow Details Help',
      overview: 'Workflow Details shows the selected workflow step-by-step with context.',
      quickSteps: [
        'Open a workflow record from Workflow list.',
        'Review each stage and status updates.',
        'Use links to open associated validation/errors if present.'
      ],
      tips: ['Keep filters consistent with parent Workflow search.']
    }
  },
  {
    routePrefix: '/workflow/workflowHistory',
    content: {
      title: 'Workflow History Help',
      overview: 'Workflow History tracks historical changes and events for workflows.',
      quickSteps: [
        'Select/confirm workflow context.',
        'Review chronological events.',
        'Use date/status narrowing for faster troubleshooting.'
      ],
      tips: ['Sort by latest events first during investigations.']
    }
  },
  {
    routePrefix: '/workflow/rdpValidationErrors',
    content: {
      title: 'RDP Validation Errors Help',
      overview: 'Review validation failures and error details for troubleshooting.',
      quickSteps: [
        'Click error on left to select rejected segment.',
        'Read error code/message and affected fields.',
        'To correct data, return to source workflow/transation.'
      ],
      tips: ['Focus on the first blocking error before secondary errors.']
    }
  },
  {
    routePrefix: '/workflow',
    content: {
      title: 'Workflow Help',
      overview: 'Workflow screen helps monitor processing states and exceptions.',
      quickSteps: [
        'Apply filters for date, status, and/or type.',
        'Search and review matching workflows.',
        'Open details (error information) and history for selected rows.'
      ],
      tips: ['Use quick date presets first, then narrow if needed.','Button at top can be used to assign a workflow to yourself.','check-boxes at left can be used to select multiple.']
    }
  },
  {
    routePrefix: '/TradingPartners/tpIds/tp-links',
    content: {
      title: 'TP Links Help',
      overview: 'Manage links associated with a TP ID.',
      quickSteps: [
        'Open TP Links from a TP ID.',
        'Add/edit/remove links as required.',
        'Use bulk add for large updates.'
      ],
      tips: ['Validate link values before saving bulk changes.']
    }
  },
  {
    routePrefix: '/TradingPartners/tpIds',
    content: {
      title: 'TPID Help',
      overview: 'TPID screen manages IDs for the selected Trading Partner and lets you drill into TP Links.',
      quickSteps: [
        'Open a Trading Partner and navigate to its TPIDs list.',
        'Add, edit, or deactivate TPIDs as needed.',
        'Use the TP Links action on a TPID row to manage link-level details.'
      ],
      tips: [
        'Keep TPID values unique and consistent with external system mappings.',
        'After TPID updates, review related TP Links for completeness.'
      ]
    }
  },
  {
    routePrefix: '/TradingPartners',
    content: {
      title: 'Trading Partners Help',
      overview: 'Create and maintain trading partners, IDs, and relationships.',
      quickSteps: [
        'Search/select a trading partner.',
        'Add or edit partner details and IDs.',
        'Use Copy TP for cloning setup where needed.'
      ],
      tips: ['Keep naming conventions consistent for easier search.']
    }
  },
  {
    routePrefix: '/search',
    content: {
      title: 'Search Help',
      overview: 'Run cross-domain searches and navigate to matching records.',
      quickSteps: [
        'Choose search type and terms.',
        'Run search and inspect results.',
        'Open linked records for details.'
      ],
      tips: ['Use specific keywords to produce clean results.']
    }
  },
  {
    routePrefix: '/x12-viewer',
    content: {
      title: 'X12 Viewer + Validator Help',
      overview: 'Upload and inspect X12 payloads with validation checks.',
      quickSteps: [
        'Load an X12 file.',
        'Review parsed segments/elements.',
        'Address validation warnings/errors shown by the tool.'
      ],
      tips: ['Use the same separators as source file for best readability.']
    }
  },
  {
    routePrefix: '/x12-compare',
    content: {
      title: 'X12 Comparison Help',
      overview: 'Compare one file pair or multiple files across folders and inspect differences.',
      quickSteps: [
        'Select mode: one pair or multiple folders.',
        'Choose files/folders and optional compare settings.',
        'Run Compare, then open detail rows for full diff.'
      ],
      tips: ['Use ignore fields for known-volatile values like timestamps.']
    }
  },
  {
    routePrefix: '/pdf-reader',
    content: {
      title: 'PDF Reader Help',
      overview: 'Open and view PDF documents related to X12 standards or any PDF file on the laptop.',
      quickSteps: [
        'Load or select the document.',
        'Navigate pages and zoom as needed.',
        'Return to source screen when review is complete.'
      ],
      tips: ['Use browser zoom controls for quick readability adjustments.']
    }
  }
];