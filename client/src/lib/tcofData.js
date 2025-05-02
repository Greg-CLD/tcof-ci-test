// Use hardcoded data instead of importing from JSON
const tcofTasksData = [
  {
    "id": "1.1",
    "name": "Ask Why",
    "tasks": {
      "Identification": ["Consult key stakeholders", "Understand pains and wants", "Define goals"],
      "Definition": ["Establish project justification", "Prioritize requirements based on value", "Document business case"],
      "Delivery": ["Maintain focus on key drivers", "Validate decisions against goals", "Keep requirements visible"],
      "Closure": ["Evaluate outcomes against objectives", "Document lessons learned", "Assess value delivered"]
    }
  },
  {
    "id": "1.2",
    "name": "Get a Masterbuilder",
    "tasks": {
      "Identification": ["Identify key expertise needed", "Secure experienced leadership", "Establish authority framework"],
      "Definition": ["Define roles and responsibilities", "Create RACI matrix", "Set escalation paths"],
      "Delivery": ["Empower decision makers", "Maintain clear leadership", "Leverage expertise efficiently"],
      "Closure": ["Acknowledge leadership contributions", "Document expertise gaps", "Plan future leadership needs"]
    }
  },
  {
    "id": "1.3",
    "name": "Share the Air",
    "tasks": {
      "Identification": ["Set up collaborative environment", "Establish ground rules", "Create inclusivity plan"],
      "Definition": ["Design communication plan", "Schedule recurring touchpoints", "Build feedback mechanisms"],
      "Delivery": ["Balance participation", "Ensure all voices heard", "Document diverse perspectives"],
      "Closure": ["Celebrate team contributions", "Assess communication effectiveness", "Document relationship impacts"]
    }
  },
  {
    "id": "2.1",
    "name": "Write Down Your Goal",
    "tasks": {
      "Identification": ["Document vision statement", "Define SMART objectives", "Create goal hierarchy"],
      "Definition": ["Link goals to requirements", "Establish success criteria", "Create measurement plan"],
      "Delivery": ["Keep goals visible", "Track progress against goals", "Update goals as needed"],
      "Closure": ["Assess goal achievement", "Document goal evolution", "Identify future goal improvements"]
    }
  },
  {
    "id": "2.2",
    "name": "Define the Difference",
    "tasks": {
      "Identification": ["Map current state process", "Envision target state", "Identify key changes"],
      "Definition": ["Document gap analysis", "Create change impact assessment", "Develop transition plan"],
      "Delivery": ["Communicate change benefits", "Support people through transition", "Track adoption metrics"],
      "Closure": ["Compare before and after states", "Document transformation journey", "Celebrate positive changes"]
    }
  },
  {
    "id": "2.3",
    "name": "Make Room for Change",
    "tasks": {
      "Identification": ["Assess change readiness", "Identify potential resistance", "Create stakeholder map"],
      "Definition": ["Develop change management plan", "Create training strategy", "Establish change champions"],
      "Delivery": ["Address resistance promptly", "Provide ongoing support", "Adjust approach based on feedback"],
      "Closure": ["Evaluate change adoption", "Document successful strategies", "Plan for sustainability"]
    }
  },
  {
    "id": "3.1",
    "name": "Get Skin in the Game",
    "tasks": {
      "Identification": ["Map stakeholder commitments", "Secure resource pledges", "Identify accountability measures"],
      "Definition": ["Create responsibility matrix", "Establish governance model", "Define escalation paths"],
      "Delivery": ["Track commitment fulfillment", "Address commitment gaps", "Recognize contributions"],
      "Closure": ["Evaluate stakeholder engagement", "Document commitment patterns", "Plan future engagement strategies"]
    }
  },
  {
    "id": "3.2",
    "name": "Manage the Clock",
    "tasks": {
      "Identification": ["Establish timeline expectations", "Identify time constraints", "Map dependencies"],
      "Definition": ["Create detailed schedule", "Build buffer for unknowns", "Set milestone reviews"],
      "Delivery": ["Track progress against timeline", "Address delays proactively", "Adjust plans as needed"],
      "Closure": ["Analyze timeline performance", "Document scheduling lessons", "Improve future time management"]
    }
  },
  {
    "id": "3.3",
    "name": "Have Two Conversations",
    "tasks": {
      "Identification": ["Set up formal/informal channels", "Create inclusive environment", "Establish feedback loops"],
      "Definition": ["Document communication plan", "Define cadence for updates", "Establish escalation paths"],
      "Delivery": ["Balance structured and casual talks", "Document key discussions", "Follow up on action items"],
      "Closure": ["Evaluate communication effectiveness", "Document successful approaches", "Plan future improvements"]
    }
  },
  {
    "id": "4.1",
    "name": "Involve Everyone",
    "tasks": {
      "Identification": ["Map stakeholder ecosystem", "Create inclusion strategies", "Define participation model"],
      "Definition": ["Design collaborative activities", "Create participation checkpoints", "Establish feedback systems"],
      "Delivery": ["Track engagement levels", "Adapt to participation patterns", "Address exclusion issues"],
      "Closure": ["Evaluate participation effectiveness", "Document inclusion successes", "Plan future engagement"]
    }
  },
  {
    "id": "4.2",
    "name": "Stay in School",
    "tasks": {
      "Identification": ["Assess knowledge gaps", "Identify learning opportunities", "Create learning objectives"],
      "Definition": ["Design knowledge sharing plan", "Establish learning resources", "Create documentation approach"],
      "Delivery": ["Implement continuous learning", "Document lessons learned", "Apply new insights"],
      "Closure": ["Evaluate knowledge growth", "Document valuable lessons", "Plan future learning needs"]
    }
  },
  {
    "id": "4.3",
    "name": "Be Ready to Adapt",
    "tasks": {
      "Identification": ["Identify potential changes", "Create flexibility measures", "Establish monitoring approach"],
      "Definition": ["Document adaptation strategy", "Create contingency plans", "Set adjustment triggers"],
      "Delivery": ["Monitor for change needs", "Implement adjustments", "Communicate adaptations"],
      "Closure": ["Evaluate adaptation effectiveness", "Document successful pivots", "Build future flexibility"]
    }
  }
];

// Memoized function to get the TCOF data
let cachedData = null;

/**
 * Returns the TCOF data with tasks and other information
 * @returns {Array} Array of TCOF success factors with tasks
 */
export function getTcofData() {
  if (cachedData) {
    return cachedData;
  }
  
  cachedData = tcofTasksData;
  return cachedData;
}

/**
 * Returns a list of TCOF factors formatted for selection dropdowns
 * @returns {Array<{value: string, label: string}>} Formatted options for dropdowns
 */
export function getTcofFactorOptions() {
  const factors = getTcofData();
  return factors.map(factor => ({
    value: factor.id,
    label: `${factor.id} - ${factor.name}`
  }));
}

/**
 * Gets tasks for a specific factor and stage
 * @param {string} factorId - The ID of the success factor
 * @param {string} stage - The stage name (Identification, Definition, Delivery, Closure)
 * @returns {Array<string>} Array of task strings
 */
export function getFactorTasks(factorId, stage) {
  const factors = getTcofData();
  const factor = factors.find(f => f.id === factorId);
  
  if (!factor || !factor.tasks || !factor.tasks[stage]) {
    return [];
  }
  
  return factor.tasks[stage];
}