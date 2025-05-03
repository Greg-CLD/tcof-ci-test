// TCOF Success Factor data from the database

export interface TCOFFactorTask {
  id: string;
  title: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

// Data comes from the database system
const tcofFactors: TCOFFactorTask[] = [
  {
    "id": "1.1",
    "title": "Ask Why",
    "tasks": {
      "Identification": [
        "Consult key stakeholders"
      ],
      "Definition": [
        "-"
      ],
      "Delivery": [
        "-"
      ],
      "Closure": [
        "-"
      ]
    }
  },
  {
    "id": "1.2",
    "title": "Set success criteria",
    "tasks": {
      "Identification": [
        "Set success criteria"
      ],
      "Definition": [
        "Set up robust reporting & monitoring"
      ],
      "Delivery": [
        "Monitor benefits realisation"
      ],
      "Closure": [
        "Complete benefit handover"
      ]
    }
  },
  {
    "id": "2.1",
    "title": "Engage stakeholders",
    "tasks": {
      "Identification": [
        "Identify key stakeholders"
      ],
      "Definition": [
        "Produce comms plan"
      ],
      "Delivery": [
        "Maintain stakeholder networks"
      ],
      "Closure": [
        "Review stakeholder engagement"
      ]
    }
  },
  {
    "id": "2.2",
    "title": "Build teams",
    "tasks": {
      "Identification": [
        "Create core team"
      ],
      "Definition": [
        "Assemble full development team",
        "Develop resource strategy"
      ],
      "Delivery": [
        "Maintain capability"
      ],
      "Closure": [
        "Manage team transition"
      ]
    }
  },
  {
    "id": "3.1",
    "title": "Set priorities",
    "tasks": {
      "Identification": [
        "Outline options"
      ],
      "Definition": [
        "Prioritise requirements"
      ],
      "Delivery": [
        "Re-prioritise requirements"
      ],
      "Closure": [
        "Identify future needs"
      ]
    }
  },
  {
    "id": "3.2",
    "title": "Design feedback",
    "tasks": {
      "Identification": [
        "Assess culture for feedback"
      ],
      "Definition": [
        "Design feedback loops"
      ],
      "Delivery": [
        "Learn from feedback"
      ],
      "Closure": [
        "Share knowledge"
      ]
    }
  },
  {
    "id": "4.1",
    "title": "Identify risks",
    "tasks": {
      "Identification": [
        "Create risk register"
      ],
      "Definition": [
        "Develop risk management plan"
      ],
      "Delivery": [
        "Monitor risk status"
      ],
      "Closure": [
        "Close outstanding risks"
      ]
    }
  },
  {
    "id": "4.2",
    "title": "Plan deployment",
    "tasks": {
      "Identification": [
        "Understand related changes"
      ],
      "Definition": [
        "Plan cutover",
        "Plan testing activities"
      ],
      "Delivery": [
        "Prepare for cutover",
        "Execute testing"
      ],
      "Closure": [
        "Complete transition to operations"
      ]
    }
  },
  {
    "id": "5.1",
    "title": "Choose methods",
    "tasks": {
      "Identification": [
        "Choose delivery method"
      ],
      "Definition": [
        "Develop project plan"
      ],
      "Delivery": [
        "Track & report progress"
      ],
      "Closure": [
        "Close delivery operation"
      ]
    }
  },
  {
    "id": "5.2",
    "title": "Create governance",
    "tasks": {
      "Identification": [
        "Create governance structure"
      ],
      "Definition": [
        "Develop stage gateways"
      ],
      "Delivery": [
        "Check at gateways"
      ],
      "Closure": [
        "Complete approvals"
      ]
    }
  },
  {
    "id": "6.1",
    "title": "Make commitments",
    "tasks": {
      "Identification": [
        "Prepare initial business case"
      ],
      "Definition": [
        "Refine business case"
      ],
      "Delivery": [
        "Manage financial resources"
      ],
      "Closure": [
        "Complete financial reconciliation"
      ]
    }
  },
  {
    "id": "6.2",
    "title": "Procure things",
    "tasks": {
      "Identification": [
        "Assess procurement needs"
      ],
      "Definition": [
        "Create procurement plan",
        "Build procurement expertise"
      ],
      "Delivery": [
        "Procure components",
        "Manage quality of deliverables"
      ],
      "Closure": [
        "Complete vendor handover"
      ]
    }
  }
];

export default tcofFactors;