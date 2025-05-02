import React from 'react';
import { Button } from '@/components/ui/button';

export default function MakeAPlanAdmin() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-tcof-blue mb-4">Admin Preset Editor</h1>
        
        <div className="p-6 border border-gray-200 rounded-lg mb-6">
          <p className="mb-4">
            This is a placeholder for the admin preset editor interface where default heuristics 
            and tasks can be customized.
          </p>
          
          <p className="italic text-gray-500 mb-6">
            In the final implementation, this would contain form fields to edit the default
            templates used for quick-start plans.
          </p>
        </div>
      </div>
    </div>
  );
}