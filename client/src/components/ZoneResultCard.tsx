import React from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import '../styles/approach.css';

interface DeliveryZone {
  zone: string;
  alias: string;
  summary: string;
  methods: string[];
  tools: string[];
}

interface ZoneResultCardProps {
  zoneData: DeliveryZone;
  onAddToPlan: () => void;
}

const ZoneResultCard: React.FC<ZoneResultCardProps> = ({ zoneData, onAddToPlan }) => {
  const { toast } = useToast();
  
  // Create plain text summary for clipboard
  const getSummaryText = () => {
    return `DELIVERY APPROACH: ${zoneData.zone} - ${zoneData.alias}\n\n` +
      `${zoneData.summary}\n\n` +
      `RECOMMENDED METHODS:\n${zoneData.methods.map(m => `• ${m}`).join('\n')}\n\n` +
      `RECOMMENDED TOOLS:\n${zoneData.tools.map(t => `• ${t}`).join('\n')}`;
  };
  
  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getSummaryText());
      toast({
        title: "Copied to clipboard",
        description: "The delivery approach summary has been copied to your clipboard."
      });
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast({
        title: "Copy failed",
        description: "Could not copy text to clipboard.",
        variant: "destructive"
      });
    }
  };
  
  // Generate and download PDF
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add TCOF branding
      doc.setTextColor(0, 128, 128); // #008080
      doc.setFontSize(22);
      doc.text(`Delivery Approach – ${zoneData.zone}`, 20, 20);
      
      // Add content
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text(zoneData.alias, 20, 30);
      
      doc.setFontSize(12);
      doc.text(zoneData.summary, 20, 40);
      
      doc.setTextColor(0, 128, 128);
      doc.setFontSize(14);
      doc.text("Recommended Methods", 20, 60);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      zoneData.methods.forEach((method, index) => {
        doc.text(`• ${method}`, 25, 70 + (index * 7));
      });
      
      doc.setTextColor(0, 128, 128);
      doc.setFontSize(14);
      doc.text("Recommended Tools", 20, 100);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      zoneData.tools.forEach((tool, index) => {
        doc.text(`• ${tool}`, 25, 110 + (index * 7));
      });
      
      // Add footer with date
      const now = new Date();
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${now.toLocaleDateString()}`, 20, 280);
      
      // Save the PDF
      doc.save(`TCOF_DeliveryApproach_${zoneData.zone.replace(' ', '')}_${now.toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF downloaded",
        description: "Your delivery approach summary has been downloaded as a PDF."
      });
    } catch (err) {
      console.error("PDF generation failed: ", err);
      toast({
        title: "PDF generation failed",
        description: "Could not generate the PDF.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="da-card">
      <div className="bg-gradient-to-r from-tcof-teal to-tcof-teal/80 rounded-t-lg -mx-6 -mt-6 px-6 py-4 text-white">
        <h3 className="text-xl font-bold">{zoneData.zone}: {zoneData.alias}</h3>
      </div>
      
      <div className="p-6 pt-4">
        <div className="bg-amber-50 p-4 rounded-lg mb-6 border border-amber-100">
          <p className="text-gray-700">{zoneData.summary}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h4 className="font-bold text-tcof-teal mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Recommended Methods
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              {zoneData.methods.map((method, index) => (
                <li key={index} className="text-gray-700">{method}</li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h4 className="font-bold text-tcof-teal mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-3.76 0-7.17-.83-10-2.308z" />
              </svg>
              Recommended Tools
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              {zoneData.tools.map((tool, index) => (
                <li key={index} className="text-gray-700">{tool}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-6 justify-between">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-1 text-sm" 
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4" /> Copy Summary
            </Button>
            
            <Button 
              variant="outline"
              className="flex items-center gap-1 text-sm"
              onClick={handleDownloadPDF}
            >
              <FileDown className="h-4 w-4" /> Download PDF
            </Button>
          </div>
          
          <Button 
            className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
            onClick={onAddToPlan}
          >
            Add to my plan & continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ZoneResultCard;