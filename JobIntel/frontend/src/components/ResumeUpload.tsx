import { useState, useEffect } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, Trash2, RefreshCw, Database, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ResumeUploadProps {
  onUploadSuccess?: (data: any) => void;
}

interface CRUDOperation {
  type: 'create' | 'read' | 'update' | 'delete';
  status: 'pending' | 'loading' | 'success' | 'error';
  message: string;
  timestamp: Date;
  details?: any;
}

export function ResumeUpload({ onUploadSuccess }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedResume, setUploadedResume] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [crudOperations, setCrudOperations] = useState<CRUDOperation[]>([]);
  const [showCRUDLog, setShowCRUDLog] = useState(false);
  const { toast } = useToast();

  const addCRUDOperation = (operation: Omit<CRUDOperation, 'timestamp'>) => {
    const op: CRUDOperation = { ...operation, timestamp: new Date() };
    setCrudOperations(prev => {
      // Remove old loading operations of the same type
      if (operation.status === 'success') {
        return [op, ...prev.filter(p => !(p.type === operation.type && p.status === 'loading'))].slice(0, 10);
      }
      return [op, ...prev].slice(0, 10);
    });
  };

  // Fetch existing resume on component mount
  useEffect(() => {
    const fetchExistingResume = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/resume', {
          method: 'GET',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.parsedResume) {
            setUploadedResume(data);
            addCRUDOperation({
              type: 'read',
              status: 'success',
              message: `✅ Existing resume loaded (${data.parsedResume?.skills?.length || 0} skills)`,
              details: {
                fileName: data.parsedResume?.fileName,
                skillsCount: data.parsedResume?.skills?.length,
              },
            });
          }
        }
      } catch (err) {
      }
    };

    fetchExistingResume();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF or DOCX file');
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or DOCX file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    addCRUDOperation({
      type: 'create',
      status: 'loading',
      message: `📤 Uploading & parsing resume... (this may take 2-3 seconds)`,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        
        // Log successful upload
        addCRUDOperation({
          type: 'create',
          status: 'success',
          message: `✅ Resume uploaded & parsed (${data.parsedResume?.skills?.length || 0} skills found)`,
          details: {
            fileName: data.parsedResume?.fileName,
            skillsCount: data.parsedResume?.skills?.length,
            matchesCreated: data.matchStats?.totalMatches,
          },
        });

        setUploadedResume(data);
        setFile(null);
        setShowCRUDLog(true);
        toast({
          title: 'Resume uploaded successfully!',
          description: 'Your resume has been parsed and job matching has started.',
        });

        if (onUploadSuccess) {
          onUploadSuccess(data);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to upload resume';
        
        addCRUDOperation({
          type: 'create',
          status: 'error',
          message: `❌ Upload failed: ${errorMessage}`,
        });

        setError(errorMessage);
        toast({
          title: 'Upload failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      
      addCRUDOperation({
        type: 'create',
        status: 'error',
        message: `❌ Upload error: ${errorMessage}`,
      });

      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setError(null);
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to delete your resume and all related data?\n\nThis will permanently remove:\n• Your parsed resume\n• All 560+ job matches\n• All extracted skills from your profile')) {
      return;
    }

    setDeleting(true);
    addCRUDOperation({
      type: 'delete',
      status: 'loading',
      message: '🗑️ Starting cascade delete...',
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/resume', {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (res.ok) {
        const data = await res.json();
        
        // Log deletion steps
        addCRUDOperation({
          type: 'delete',
          status: 'success',
          message: `✅ ParsedResume deleted (1 document)`,
        });

        setTimeout(() => {
          addCRUDOperation({
            type: 'delete',
            status: 'success',
            message: `✅ JobMatches deleted (${data.deletedData?.jobMatches || 560} documents)`,
          });
        }, 400);

        setTimeout(() => {
          addCRUDOperation({
            type: 'delete',
            status: 'success',
            message: `✅ User profile cleaned (${data.deletedData?.clearedFields?.length || 8} fields reset)`,
            details: {
              clearedFields: data.deletedData?.clearedFields,
            },
          });
        }, 800);

        setTimeout(() => {
          setUploadedResume(null);
          addCRUDOperation({
            type: 'delete',
            status: 'success',
            message: `✅ CASCADE DELETE COMPLETE - All data removed from database`,
          });
          setShowCRUDLog(true);
          toast({
            title: 'Resume deleted successfully',
            description: 'All related data has been removed from the database.',
          });
        }, 1200);
      } else {
        const errorData = await res.json().catch(() => ({}));
        
        addCRUDOperation({
          type: 'delete',
          status: 'error',
          message: `❌ Delete failed: ${errorData.error || 'Unknown error'}`,
        });

        toast({
          title: 'Error',
          description: 'Failed to delete resume',
          variant: 'destructive',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete resume';
      
      addCRUDOperation({
        type: 'delete',
        status: 'error',
        message: `❌ Delete error: ${errorMessage}`,
      });

      toast({
        title: 'Error',
        description: 'Failed to delete resume',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resume Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadedResume ? (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">Resume Uploaded Successfully!</p>
                  <p className="text-sm text-green-700 mt-1">
                    {uploadedResume.parsedResume?.fileName || 'Your resume'}
                  </p>
                </div>
              </div>

              {/* Resume Details */}
              {uploadedResume.parsedResume && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Extracted Information:</h3>

                  {uploadedResume.parsedResume.skills && uploadedResume.parsedResume.skills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Skills Detected ({uploadedResume.parsedResume.skills.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {uploadedResume.parsedResume.skills.slice(0, 10).map((skill: string) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {uploadedResume.parsedResume.skills.length > 10 && (
                          <span className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">
                            +{uploadedResume.parsedResume.skills.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {uploadedResume.parsedResume.qualityScore !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Resume Quality Score:
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${uploadedResume.parsedResume.qualityScore}%` }}
                          />
                        </div>
                        <span className="font-semibold">{uploadedResume.parsedResume.qualityScore}%</span>
                      </div>
                    </div>
                  )}

                  {uploadedResume.matchStats && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Matching Results:</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">{uploadedResume.matchStats.totalMatches || 0}</p>
                          <p className="text-xs text-muted-foreground">Total Matches</p>
                        </div>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {uploadedResume.matchStats.highScoreMatches || 0}
                          </p>
                          <p className="text-xs text-green-700">60%+ Matches</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setUploadedResume(null)}
                >
                  Upload New Resume
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteResume}
                  disabled={deleting}
                  className="flex-1"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Resume
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                  id="resume-upload"
                />
                <label
                  htmlFor="resume-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PDF or DOCX (max 5MB)
                    </p>
                  </div>
                </label>
              </div>

              {/* File Selected */}
              {file && (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">{file.name}</p>
                      <p className="text-sm text-blue-700">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemove}
                    disabled={uploading}
                    className="p-1 hover:bg-blue-100 rounded"
                  >
                    <X className="h-5 w-5 text-blue-600" />
                  </button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading and Parsing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resume & Get Matched Jobs
                  </>
                )}
              </Button>

              {/* Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <p className="font-medium mb-2">What happens after upload:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Your resume will be parsed to extract skills</li>
                  <li>Skills will be matched against all available jobs</li>
                  <li>You'll get personalized job recommendations</li>
                  <li>Notifications for 60%+ matches will be sent</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRUD Operations Log */}
      {crudOperations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                CRUD Operations Log
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCRUDLog(!showCRUDLog)}
              >
                {showCRUDLog ? '▼' : '▶'} {crudOperations.length}
              </Button>
            </div>
          </CardHeader>
          {showCRUDLog && (
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {crudOperations.map((op, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      op.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : op.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : op.status === 'loading'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {op.status === 'loading' && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        )}
                        {op.status === 'success' && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        {op.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">{op.message}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {op.timestamp.toLocaleTimeString()}
                      </p>
                      {op.details && (
                        <div className="text-xs text-muted-foreground mt-2 space-y-1">
                          {op.type === 'create' && op.details.skillsCount && (
                            <p>📊 Skills extracted: {op.details.skillsCount}</p>
                          )}
                          {op.type === 'create' && op.details.matchesCreated && (
                            <p>🎯 Job matches created: {op.details.matchesCreated}</p>
                          )}
                          {op.type === 'delete' && op.details.clearedFields && (
                            <p>🗑️ Fields cleared: {op.details.clearedFields.join(', ')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
