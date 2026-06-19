import React, { useState } from "react";
import { ArrowLeft, MoreVertical, Phone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { Participant } from "../types";
import { ReportUserModal } from "@/components/ReportUserModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ChatHeaderProps {
  participant: Participant;
  onBack: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ participant, onBack }) => {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
    <header className="h-16 bg-surface border-b border-black/5 px-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full -ml-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl">
            <AvatarImage src={participant.photoURL} />
            <AvatarFallback className="bg-primary/10 text-primary font-black uppercase">
              {participant.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-black text-textPrimary text-sm leading-tight tracking-tight">
              {participant.displayName}
            </h2>
            <p className="text-[10px] font-bold text-success uppercase tracking-widest leading-none mt-0.5">
              {participant.isOnline ? "Online" : "Active recently"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="rounded-full text-textSecondary opacity-50 hover:opacity-100">
          <Phone className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full text-textSecondary opacity-50 hover:opacity-100 outline-none">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
            <DropdownMenuItem 
              onClick={() => setReportOpen(true)}
              className="text-error focus:text-error focus:bg-error/10 cursor-pointer rounded-lg flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold text-xs uppercase tracking-wider">Report User</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <ReportUserModal 
      isOpen={reportOpen} 
      onClose={() => setReportOpen(false)} 
      participant={participant} 
    />
    </>
  );
};
