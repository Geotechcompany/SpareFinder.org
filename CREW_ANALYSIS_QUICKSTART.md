# Deep Research Real-Time Progress - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Database Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of database-crew-analysis-jobs.sql
```

Or use the file directly:
```bash
# Upload to Supabase
cat database-crew-analysis-jobs.sql
```

### Step 2: Update History Page

Add this code to your `src/pages/History.tsx`:

```typescript
// 1. Add imports at the top
import { CrewAnalysisProgress } from '@/components/CrewAnalysisProgress';
import { crewAnalysisJobService, CrewAnalysisJob } from '@/services/crewAnalysisJobService';

// 2. Add state in the component
const [crewJobs, setCrewJobs] = useState<CrewAnalysisJob[]>([]);

// 3. Add fetch function
const fetchCrewJobs = async () => {
  try {
    const response = await api.upload.getCrewAnalysisJobs();
    if (response.success && response.data) {
      setCrewJobs(response.data);
      
      // Auto-start pending jobs
      response.data.forEach((job: CrewAnalysisJob) => {
        if (job.status === 'pending' && !crewAnalysisJobService.isProcessing(job.id)) {
          crewAnalysisJobService.startAnalysis(job, (update) => {
            console.log('Progress:', update);
            // Optionally update UI here
          });
        }
      });
    }
  } catch (error) {
    console.error('Failed to fetch crew jobs:', error);
  }
};

// 4. Add useEffect to fetch jobs
useEffect(() => {
  fetchCrewJobs();
  const interval = setInterval(fetchCrewJobs, 5000);
  return () => clearInterval(interval);
}, []);

// 5. Add crew job cards in your render (alongside existing job cards)
{crewJobs.length > 0 && (
  <div className="mb-6">
    <h3 className="text-xl font-bold text-white mb-4">🤖 SpareFinder AI Research Jobs</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {crewJobs.map((job) => (
        <Card key={job.id} className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl">
                🤖
              </div>
              <div>
                <CardTitle className="text-white text-sm">SpareFinder AI Research</CardTitle>
                <CardDescription className="text-xs">{job.image_name}</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {job.image_url && (
              <img
                src={job.image_url}
                alt={job.image_name}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}
            
            <CrewAnalysisProgress
              status={job.status}
              currentStage={job.current_stage}
              progress={job.progress || 0}
              errorMessage={job.error_message}
              compact={true}
            />
            
            <div className="mt-2 text-xs text-gray-500">
              {format(new Date(job.created_at), 'MMM d, h:mm a')}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)}
```

### Step 3: Test It!

1. Go to Upload page
2. Upload an image
3. Click "🤖 SpareFinder AI Research"
4. You'll be redirected to History page
5. Watch the progress in real-time! ✨

## 🎯 What You Get

- ✅ **Automatic redirect** from Upload to History
- ✅ **Real-time progress** with visual indicators
- ✅ **Background processing** - navigate freely
- ✅ **Progress stages**:
  - 🔍 Image Analysis
  - 🔬 Part Identification
  - 📊 Technical Research
  - 🏪 Supplier Discovery
  - 📄 Report Generation

## 📝 Key Features

### 1. User Experience
- No more waiting on a modal
- Can navigate away and come back
- Clear progress indicators
- Error messages if something fails

### 2. Technical
- WebSocket for real-time updates
- Database persistence
- Automatic job processing
- Graceful error handling

### 3. Security
- Row Level Security (RLS)
- User-specific jobs
- Secure image storage

## 🔧 Customization

### Change Progress Colors
Edit `src/components/CrewAnalysisProgress.tsx`:
```typescript
// Line 68-75
className={
  isAnalyzing
    ? 'bg-blue-500'  // Change to your color
    : isCompleted
    ? 'bg-green-500'
    : 'bg-red-500'
}
```

### Change Poll Interval
Edit History page:
```typescript
// Change from 5000 to your preferred interval (in milliseconds)
const interval = setInterval(fetchCrewJobs, 3000); // 3 seconds
```

### Add Notifications
When analysis completes, show a notification:
```typescript
crewAnalysisJobService.startAnalysis(job, (update) => {
  if (update.stage === 'completion') {
    toast({
      title: 'Analysis Complete! 🎉',
      description: 'Your PDF report is ready',
    });
  }
});
```

## 🐛 Troubleshooting

### Problem: Jobs not showing
**Solution**: 
1. Check database table exists: `SELECT * FROM crew_analysis_jobs;`
2. Check RLS policies are active
3. Verify user is authenticated

### Problem: Progress not updating
**Solution**:
1. Check AI Crew backend is running
2. Verify WebSocket connection
3. Check browser console for errors

### Problem: Image not loading
**Solution**:
1. Verify image URL is publicly accessible
2. Check Supabase Storage permissions
3. Check CORS settings

## 📚 Full Documentation

For complete implementation details, see:
- `CREW_ANALYSIS_REALTIME_IMPLEMENTATION.md`

## 🎉 That's It!

You now have a fully functional real-time Deep Research progress tracker! Users can start an analysis and watch it progress in the History page, providing a professional and seamless experience.

---

Need help? Check the troubleshooting section or review the full implementation guide.






