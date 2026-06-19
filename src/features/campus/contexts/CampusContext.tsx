/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import { Campus, CAMPUSES, getCampusById } from "@/lib/campus";
import { useAuth } from "@/features/auth/contexts/AuthContext";

interface CampusContextType {
  selectedCampus: Campus | null;
  setCampus: (campusId: string) => void;
  isLoading: boolean;
}

const CampusContext = createContext<CampusContextType | undefined>(undefined);

const STORAGE_KEY = "siyayya_selected_campus";

export const CampusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initCampus = () => {
      if (user?.campusId) {
        const campus = getCampusById(user.campusId);
        if (campus) {
          setSelectedCampus(campus);
          setIsLoading(false);
          return;
        }
      }

      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const campus = getCampusById(savedId);
        if (campus) {
          setSelectedCampus(campus);
          setIsLoading(false);
          return;
        }
      }

      const defaultCampus = getCampusById("fuk");
      if (defaultCampus) {
        setSelectedCampus(defaultCampus);
      }
      setIsLoading(false);
    };

    initCampus();
  }, [user?.campusId]);

  const setCampus = (campusId: string) => {
    const campus = getCampusById(campusId);
    if (campus) {
      setSelectedCampus(campus);
      localStorage.setItem(STORAGE_KEY, campusId);
    }
  };

  return (
    <CampusContext.Provider value={{ selectedCampus, setCampus, isLoading }}>
      {children}
    </CampusContext.Provider>
  );
};

export const useCampus = () => {
  const context = useContext(CampusContext);
  if (context === undefined) {
    throw new Error("useCampus must be used within a CampusProvider");
  }
  return context;
};
