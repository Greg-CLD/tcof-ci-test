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
      <h3 className="text-xl font-bold">{zoneData.zone}: {zoneData.alias}</h3>
      <p className="text-gray-700 mb-4">{zoneData.summary}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-bold text-tcof-teal mb-2">Recommended Methods</h4>
          <ul className="list-disc pl-5 space-y-1">
            {zoneData.methods.map((method, index) => (
              <li key={index} className="text-gray-700">{method}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-tcof-teal mb-2">Recommended Tools</h4>
          <ul className="list-disc pl-5 space-y-1">
            {zoneData.tools.map((tool, index) => (
              <li key={index} className="text-gray-700">{tool}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 mt-6">
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
        
        <Button 
          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white ml-auto"
          onClick={onAddToPlan}
        >
          Add to my plan & continue
        </Button>
      </div>
    </div>
  );
};

export default ZoneResultCard;