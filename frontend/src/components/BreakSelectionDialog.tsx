import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Wind, Puzzle } from 'lucide-react'; // Icons for options

// Define the types of breaks
export type BreakChoice = 'stretching' | 'breathing' | 'puzzle';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectBreak: (choice: BreakChoice) => void;
}

export const BreakSelectionDialog: React.FC<Props> = ({ isOpen, onClose, onSelectBreak }) => {
  const handleSelect = (choice: BreakChoice) => {
    onSelectBreak(choice);
    onClose(); // Close the dialog after selection
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose Your Break</DialogTitle>
          <DialogDescription>
            Select the type of microbreak you'd like to take right now.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Stretching Option */}
          <Button 
            variant="outline" 
            className="w-full justify-start text-left h-auto py-3"
            onClick={() => handleSelect('stretching')}
          >
            <Zap className="mr-3 h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-semibold">Stretch</p>
              <p className="text-sm text-muted-foreground">Quick physical reset.</p>
            </div>
          </Button>
          
          {/* Breathing Option */}
          <Button 
            variant="outline" 
            className="w-full justify-start text-left h-auto py-3"
            onClick={() => handleSelect('breathing')}
          >
            <Wind className="mr-3 h-5 w-5 text-blue-500" />
             <div>
              <p className="font-semibold">Breathe</p>
              <p className="text-sm text-muted-foreground">Calm your mind and body.</p>
            </div>
          </Button>

          {/* Puzzle Option */}
          <Button 
            variant="outline" 
            className="w-full justify-start text-left h-auto py-3"
            onClick={() => handleSelect('puzzle')}
          >
            <Puzzle className="mr-3 h-5 w-5 text-green-500" />
            <div>
              <p className="font-semibold">Puzzle</p>
              <p className="text-sm text-muted-foreground">Engage your brain differently.</p>
            </div>
          </Button>
        </div>
        <DialogFooter>
          {/* Optionally add a cancel button if needed, though clicking outside closes it */}
           <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
