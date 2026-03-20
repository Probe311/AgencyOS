
import React from 'react';
import { SearchResultItem } from '../types';
import { Briefcase, User, Target, Layers, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

interface SearchResultsProps {
  results: SearchResultItem[];
  onSelect: (item: SearchResultItem) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results, onSelect }) => {
  if (results.length === 0) {
    return (
      <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-4 text-center z-50">
         <p className="text-sm text-slate-400">No results found.</p>
      </div>
    );
  }

  return (
    <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
      <div className="max-h-[400px] overflow-y-auto">
        <div className="p-2">
           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Top Results</h4>
           {results.map((result) => (
             <Button 
               key={result.id}
               onClick={() => onSelect(result)}
               variant="ghost"
               className="w-full flex items-center !justify-start gap-3 p-3 hover:bg-slate-50 rounded-xl transition-all duration-500 text-left group h-auto"
             >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                   result.type === 'Tâche' ? 'bg-blue-100 text-blue-600' :
                   result.type === 'Lead' ? 'bg-emerald-100 text-emerald-600' :
                   result.type === 'Employé' ? 'bg-indigo-100 text-indigo-600' :
                   'bg-slate-100 text-slate-600'
                }`}>
                   {result.type === 'Tâche' && <Layers size={16} />}
                   {result.type === 'Lead' && <Target size={16} />}
                   {result.type === 'Employé' && <User size={16} />}
                   {result.type === 'Projet' && <Briefcase size={16} />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                   <h5 className="text-sm font-semibold text-slate-800 truncate">{result.title}</h5>
                   <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:translate-x-1 ml-auto" />
             </Button>
           ))}
        </div>
      </div>
      <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
         <span className="text-[10px] text-slate-400">Press Enter to search all</span>
      </div>
    </div>
  );
};
