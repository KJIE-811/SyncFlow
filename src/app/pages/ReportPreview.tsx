import { ExternalLink, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export function ReportPreview() {
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const pdfUrl = `${window.location.origin}${basePath}mock-report.pdf`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#F9FAFB' }}>
          Report Preview
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          Mock PDF preview used for deployed builds.
        </p>
      </div>

      <Card className="border-0 shadow-lg" style={{ backgroundColor: '#1E293B' }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2" style={{ color: '#E5E7EB' }}>
            <FileText className="w-5 h-5" style={{ color: '#6366F1' }} />
            Mock PDF Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#334155' }}>
            <iframe
              title="SyncFlow Mock Report PDF"
              src={pdfUrl}
              className="w-full"
              style={{ height: '75vh', backgroundColor: '#0F172A' }}
            />
          </div>

          <div className="flex justify-end">
            <Button asChild variant="outline" style={{ borderColor: '#6366F1', color: '#6366F1' }}>
              <a href={pdfUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open PDF Directly
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
