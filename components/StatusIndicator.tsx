import React from 'react';
import { AgentStatus } from '../types';

interface StatusIndicatorProps {
  status: AgentStatus;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case AgentStatus.IDLE:
        return { text: 'Idle', color: 'bg-gray-500' };
      case AgentStatus.CONNECTING:
        return { text: 'Connecting...', color: 'bg-yellow-500', animate: true };
      case AgentStatus.LISTENING:
        return { text: 'Listening...', color: 'bg-green-500', animate: true };
      case AgentStatus.THINKING:
        return { text: 'Thinking...', color: 'bg-blue-500', animate: true };
      case AgentStatus.SPEAKING:
        return { text: 'Speaking...', color: 'bg-teal-500' };
      case AgentStatus.ERROR:
        return { text: 'Error', color: 'bg-red-500' };
      default:
        return { text: 'Offline', color: 'bg-gray-500' };
    }
  };

  const { text, color, animate } = getStatusInfo();

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color} ${animate ? 'animate-pulse' : ''}`}></div>
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  );
};

export default StatusIndicator;
