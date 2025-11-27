import * as XLSX from "xlsx";
import { format } from "date-fns";

interface CompletionRecord {
  id: string;
  checklist_date: string;
  status: string;
  completion_percentage: number | null;
  completed_at: string | null;
  started_at: string | null;
  locations: { name: string } | null;
  checklist_templates: { name: string } | null;
  [key: string]: any;
}

interface ItemCompletion {
  status: string;
  notes: string | null;
  initials: string | null;
  completed_at: string | null;
  checklist_items: {
    task_description: string;
    time_slot: string | null;
    allow_na: boolean | null;
    is_required: boolean | null;
  } | null;
  profiles?: { full_name: string; initials: string | null } | null;
}

export const exportChecklistToExcel = async (
  completionRecords: CompletionRecord[],
  itemCompletionsByRecord: Record<string, ItemCompletion[]>
) => {
  // Summary sheet
  const summaryData = completionRecords.map(record => ({
    Date: format(new Date(record.checklist_date), "MMM dd, yyyy"),
    Location: record.locations?.name || "N/A",
    Template: record.checklist_templates?.name || "N/A",
    Status: record.status,
    "Completion %": record.completion_percentage || 0,
    "Completed By": record.profiles?.full_name || "N/A",
    "Completed At": record.completed_at
      ? format(new Date(record.completed_at), "MMM dd, yyyy h:mm a")
      : "N/A",
  }));

  // Detailed items sheet
  const detailedData: any[] = [];
  completionRecords.forEach(record => {
    const items = itemCompletionsByRecord[record.id] || [];
    items.forEach(item => {
      detailedData.push({
        Date: format(new Date(record.checklist_date), "MMM dd, yyyy"),
        Location: record.locations?.name || "N/A",
        Task: item.checklist_items?.task_description || "N/A",
        "Time Slot": item.checklist_items?.time_slot || "N/A",
        Status: item.status,
        Initials: item.initials || "N/A",
        "Completed By": item.profiles?.full_name || "N/A",
        "Completed At": item.completed_at
          ? format(new Date(item.completed_at), "MMM dd, yyyy h:mm a")
          : "N/A",
        Notes: item.notes || "",
      });
    });
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Add summary sheet
  const ws1 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, "Summary");
  
  // Add detailed sheet
  const ws2 = XLSX.utils.json_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(wb, ws2, "Detailed Tasks");

  // Generate file
  const fileName = `Checklist_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
