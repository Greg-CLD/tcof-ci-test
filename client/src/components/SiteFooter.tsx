import React from "react";
import { Separator } from "@/components/ui/separator";

export default function SiteFooter() {
  return (
    <footer className="bg-white py-12 border-t border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h3 className="font-bold text-xl text-tcof-dark mb-2">The Connected Outcomes Framework</h3>
            <p className="text-gray-600 mb-4">
              Evidence-based tools for delivering complex change
            </p>
          </div>
          
          <div className="text-right mt-6 md:mt-0">
            <a href="mailto:Support@confluity.co.uk" className="text-tcof-teal hover:underline">
              Support@confluity.co.uk
            </a>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            2025 Confluity &copy; All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}