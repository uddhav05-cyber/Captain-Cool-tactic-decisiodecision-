import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface HistoryPoint {
  time: string;
  prob: number;
}

export const WinProbabilityChart: React.FC<{ history: HistoryPoint[] }> = ({ history }) => {
  return (
    <div className="w-full h-48 py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.4em]">Success Probability Wave</h4>
        <div className="text-[10px] font-mono text-zinc-700 tracking-tighter">ESTIMATED_PROBABILITY_DATAFEED</div>
      </div>
      <div className="w-full h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="1 10" stroke="#ffffff10" vertical={false} />
            <XAxis 
              dataKey="time" 
              hide 
            />
            <YAxis 
              domain={[0, 100]} 
              hide
            />
            <Tooltip 
              cursor={{ stroke: '#ffffff20', strokeWidth: 1 }}
              contentStyle={{ 
                backgroundColor: '#0a0a0a', 
                border: '1px solid #ffffff10',
                borderRadius: '0px',
                fontSize: '9px',
                fontFamily: 'monospace',
                padding: '4px 8px'
              }}
              itemStyle={{ color: '#fff', padding: 0 }}
              labelStyle={{ display: 'none' }}
            />
            <ReferenceLine y={50} stroke="#ffffff05" />
            <Line 
              type="monotone" 
              dataKey="prob" 
              stroke="#ffffff" 
              strokeWidth={1}
              dot={false}
              activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }}
              animationDuration={2000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
