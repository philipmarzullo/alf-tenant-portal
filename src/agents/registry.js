import { hrAgent } from './configs/hr';
import { financeAgent } from './configs/finance';
import { purchasingAgent } from './configs/purchasing';
import { qbuAgent } from './configs/qbu';
import { salesDeckAgent } from './configs/salesDeck';

const agents = {
  hr: hrAgent,
  finance: financeAgent,
  purchasing: purchasingAgent,
  qbu: qbuAgent,
  salesDeck: salesDeckAgent,
};

export function getAgent(agentKey) {
  return agents[agentKey] || null;
}

export function getAgentAction(agentKey, actionKey) {
  const agent = getAgent(agentKey);
  if (!agent) return null;
  return agent.actions[actionKey] || null;
}

export function getAllAgents() {
  return Object.entries(agents).map(([key, config]) => ({
    key,
    ...config,
  }));
}

export default agents;
