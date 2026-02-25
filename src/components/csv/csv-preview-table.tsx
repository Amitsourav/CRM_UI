import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CsvPreviewTableProps {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
}

export function CsvPreviewTable({ rows, mapping }: CsvPreviewTableProps) {
  const headers = Object.keys(mapping).filter((k) => mapping[k] !== "skip");

  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>
                {mapping[h]?.replace(/_/g, " ") || h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {headers.map((h) => (
                <TableCell key={h} className="text-xs">
                  {row[h] || ""}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
