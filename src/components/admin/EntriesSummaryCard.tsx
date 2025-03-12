
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";
import { ManualSyncButton } from "@/components/ManualSyncButton";

interface EntriesSummaryCardProps {
  entriesCount: number;
}

export const EntriesSummaryCard = ({ entriesCount }: EntriesSummaryCardProps) => {
  return (
    <Card className="mb-8 overflow-hidden border border-gray-100">
      <CardHeader className="bg-white py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-full">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">User Entries</CardTitle>
              <CardDescription className="text-gray-500">
                Total entries: {entriesCount}
              </CardDescription>
            </div>
          </div>
          
          <ManualSyncButton />
        </div>
      </CardHeader>
    </Card>
  );
};
