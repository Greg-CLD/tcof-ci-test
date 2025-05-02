import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface IntroAccordionProps {
  title: string;
  children: React.ReactNode;
}

export default function IntroAccordion({ title, children }: IntroAccordionProps) {
  return (
    <div className="mb-8">
      <Accordion type="single" collapsible defaultValue="">
        <AccordionItem value="intro">
          <AccordionTrigger className="text-xl font-semibold text-tcof-dark">
            {title}
          </AccordionTrigger>
          <AccordionContent className="text-gray-700">
            {children}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}