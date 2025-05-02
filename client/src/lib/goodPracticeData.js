// Use hardcoded data instead of importing from JSON
const goodPracticesData = [
  {
    "code": "PRAXIS",
    "name": "Praxis Framework",
    "tasks": {
      "Identification": ["Produce a Brief", "Create a Definition Plan"],
      "Definition": ["Define Scope", "Project/Programme Mgt Plan", "Business Case"],
      "Delivery": ["Delegate delivery", "Communicate with stakeholders", "Monitor progress"],
      "Closure": ["Handover to Operations", "Demobilise project", "Capture lessons learned"]
    }
  },
  {
    "code": "TEAL_BOOK",
    "name": "UK Government Teal Book",
    "tasks": {
      "Identification": ["Appoint SRO", "Validate the project brief", "Prepare Strategic Outline Case"],
      "Definition": ["Detail delivery & procurement approach", "Develop OBC / FBC"],
      "Delivery": ["Ensure outputs align with outcomes", "Ongoing risk management", "Change control"],
      "Closure": []
    }
  },
  {
    "code": "SAFe",
    "name": "SAFe Implementation Roadmap",
    "tasks": {
      "Identification": ["Lean Business Case", "Reaching the Tipping Point", "Train Change Agents"],
      "Definition": ["Train Leaders", "Identify Value Streams", "Create Implementation Plan"],
      "Delivery": ["Prepare for ART Launch", "Continuous Delivery Pipeline", "Coach ART Execution"],
      "Closure": ["Transition to CD Pipeline", "Extend to Portfolio", "Sustain & Improve"]
    }
  },
  {
    "code": "AGILEPM",
    "name": "AgilePM",
    "tasks": {
      "Identification": ["Appoint Sponsor & PM", "Conduct Feasibility Assessment"],
      "Definition": ["Run Foundations Phase", "Prioritised Requirements List", "Solution Architecture"],
      "Delivery": ["Plan & run Timeboxes", "Engage stakeholders", "Demonstrate increments"],
      "Closure": ["Deploy final increment", "Post-Project Review", "Benefits measurement"]
    }
  }
];

// Map zones to recommended frameworks
const zoneToFrameworksMap = {
  'Zone A': ["PRAXIS", "AGILEPM"],
  'Zone B': ["PRAXIS", "TEAL_BOOK", "AGILEPM"],
  'Zone C': ["SAFe", "AGILEPM"],
  'Zone D': ["SAFe"],
  'Zone E': ["TEAL_BOOK"]
};

// Zone calculation matrix based on scope and uncertainty
const zoneMatrix = {
  'Small': {
    'Low': 'Zone A',
    'Medium': 'Zone B',
    'High': 'Zone C'
  },
  'Medium': {
    'Low': 'Zone B',
    'Medium': 'Zone C',
    'High': 'Zone D'
  },
  'Large': {
    'Low': 'Zone C',
    'Medium': 'Zone D',
    'High': 'Zone E'
  }
};

// Zone descriptions for UI display
const zoneDescriptions = {
  'Zone A': "Simple projects with clear objectives and minimal complexity. Traditional waterfall or lightweight adaptive approaches work well.",
  'Zone B': "Hybrid/Adaptive zone where structured processes meet flexibility. Blend traditional planning with iterative delivery.",
  'Zone C': "Agile zone suitable for projects with evolving requirements but manageable complexity. Focus on incremental delivery.",
  'Zone D': "Complex Agile scenarios requiring scaled frameworks and cross-team coordination. Suited for large initiatives with high uncertainty.",
  'Zone E': "Systems-Led projects needing rigorous control and governance. Appropriate for large, high-impact initiatives requiring formal oversight."
};

// Framework descriptions
const frameworkDescriptions = {
  'PRAXIS': "A comprehensive framework that integrates project, programme and portfolio management with a flexible lifecycle approach.",
  'TEAL_BOOK': "UK Government guidance for appraising and evaluating policies, projects and programmes with robust governance.",
  'SAFe': "Scaled Agile Framework for enterprise-level agile transformation and delivery of large-scale solutions.",
  'AGILEPM': "A practical and scalable methodology for agile project management that balances structure and flexibility."
};

// Memoized function to get the data
let cachedData = null;

/**
 * Returns all good practices data
 * @returns {Array} Array of good practices frameworks
 */
export function getAllGoodPractices() {
  if (cachedData) {
    return cachedData;
  }
  
  cachedData = goodPracticesData;
  return cachedData;
}

/**
 * Get a specific framework by its code
 * @param {string} code - The framework code (e.g., "PRAXIS")
 * @returns {Object|null} The framework object or null if not found
 */
export function getFrameworkByCode(code) {
  const frameworks = getAllGoodPractices();
  return frameworks.find(f => f.code === code) || null;
}

/**
 * Get recommended frameworks for a specific zone
 * @param {string} zone - The zone code (e.g., "Zone A")
 * @returns {Array<string>} Array of framework codes
 */
export function getFrameworksForZone(zone) {
  return zoneToFrameworksMap[zone] || [];
}

/**
 * Calculate the zone based on scope and uncertainty
 * @param {string} scope - "Small", "Medium", or "Large"
 * @param {string} uncertainty - "Low", "Medium", or "High"
 * @returns {string} The calculated zone (e.g., "Zone A")
 */
export function calculateZone(scope, uncertainty) {
  if (!scope || !uncertainty) {
    return null;
  }
  
  return zoneMatrix[scope][uncertainty] || null;
}

/**
 * Get the description for a zone
 * @param {string} zone - The zone (e.g., "Zone A")
 * @returns {string} The zone description
 */
export function getZoneDescription(zone) {
  return zoneDescriptions[zone] || '';
}

/**
 * Get the description for a framework
 * @param {string} code - The framework code (e.g., "PRAXIS")
 * @returns {string} The framework description
 */
export function getFrameworkDescription(code) {
  return frameworkDescriptions[code] || '';
}