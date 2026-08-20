import { getAdminDashboard } from "@/actions/admin.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  try {
    const dashboard = await getAdminDashboard();

    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{dashboard.overview.users}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Posts</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{dashboard.overview.posts}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{dashboard.overview.pendingReports}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>System</CardTitle>
            </CardHeader>
            <CardContent className="text-sm font-medium capitalize">{dashboard.overview.status}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reported content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.reports.length === 0 && <p className="text-sm text-muted-foreground">No reports to review.</p>}
            {dashboard.reports.map((report) => (
              <div key={report.id} className="rounded-md border p-4">
                <p className="font-medium">{report.reason}</p>
                <p className="text-sm text-muted-foreground">
                  {report.status} · reported by @{report.reporter.username}
                </p>
                {report.post?.content && <p className="mt-2 text-sm">{report.post.content}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  } catch {
    return <p className="text-sm text-muted-foreground">Admin access required.</p>;
  }
}
