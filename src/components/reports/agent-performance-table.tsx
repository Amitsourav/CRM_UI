"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgentReport } from "@/types";

interface AgentPerformanceTableProps {
  data: AgentReport[];
  isLoading: boolean;
}

export function AgentPerformanceTable({
  data,
  isLoading,
}: AgentPerformanceTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Total Leads</TableHead>
                <TableHead className="text-right">Won</TableHead>
                <TableHead className="text-right">Lost</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Tasks Done</TableHead>
                <TableHead className="text-right">Tasks Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No agent data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((report) => (
                  <TableRow key={report.agent_id}>
                    <TableCell className="font-medium">
                      {report.agent_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.total_leads}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {report.won || 0}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {report.lost || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.total_calls}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.tasks_completed}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {report.tasks_overdue}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
