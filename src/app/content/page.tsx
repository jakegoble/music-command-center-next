'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentType = 'youtube_video' | 'youtube_short' | 'instagram_reel' | 'instagram_post' | 'instagram_story' | 'tiktok' | 'blog_post' | 'press_release' | 'other';
type ContentStage = 'idea' | 'production' | 'mastering' | 'scheduled' | 'published' | 'promoted';

interface ChecklistItem {
  id: string;
  stepName: string;
  isComplete: boolean;
}

interface ContentProject {
  id: string;
  title: string;
  type: ContentType;
  stage: ContentStage;
  checklist: ChecklistItem[];
  publishDate: string | null;
  assignedTo: string | null;
  notes: string | null;
  views: number | null;
  likes: number | null;
  createdAt: string;
  updatedAt: string;
}

const STAGES: { key: ContentStage; label: string; color: string }[] = [
  { key: 'idea', label: 'Idea', color: '#9CA3AF' },
  { key: 'production', label: 'Production', color: '#3B82F6' },
  { key: 'mastering', label: 'Mastering', color: '#8B5CF6' },
  { key: 'scheduled', label: 'Scheduled', color: '#F59E0B' },
  { key: 'published', label: 'Published', color: '#10B981' },
  { key: 'promoted', label: 'Promoted', color: '#EF4444' },
];

const TYPE_LABELS: Record<ContentType, string> = {
  youtube_video: 'YouTube Video',
  youtube_short: 'YouTube Short',
  instagram_reel: 'Instagram Reel',
  instagram_post: 'Instagram Post',
  instagram_story: 'Instagram Story',
  tiktok: 'TikTok',
  blog_post: 'Blog Post',
  press_release: 'Press Release',
  other: 'Other',
};

const DEFAULT_CHECKLISTS: Record<ContentType, string[]> = {
  youtube_video: ['Concept & outline', 'Script/storyboard', 'Film A-roll', 'Film B-roll', 'Edit video', 'Color grade', 'Add music/SFX', 'Create thumbnail', 'Write title & description', 'Add tags & cards', 'Schedule upload', 'Promote on socials'],
  youtube_short: ['Concept', 'Film clip', 'Edit (< 60s)', 'Add caption/text', 'Upload', 'Cross-post'],
  instagram_reel: ['Concept', 'Film content', 'Edit in app', 'Write caption', 'Select audio', 'Add hashtags', 'Schedule/post'],
  instagram_post: ['Concept', 'Create visual', 'Write caption', 'Add hashtags', 'Schedule/post'],
  instagram_story: ['Create content', 'Add stickers/links', 'Post', 'Save to highlights'],
  tiktok: ['Concept', 'Film content', 'Edit with effects', 'Write caption', 'Add sounds/hashtags', 'Post'],
  blog_post: ['Topic research', 'Outline', 'First draft', 'Edit/revise', 'Add images', 'SEO optimization', 'Publish', 'Promote'],
  press_release: ['Draft release', 'Internal review', 'Media list', 'Send to contacts', 'Follow up', 'Track coverage', 'Archive'],
  other: ['Plan', 'Create', 'Review', 'Publish'],
};

const LS_KEY = 'mcc_content_projects';

function loadProjects(): ContentProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveProjects(projects: ContentProject[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(projects));
}

function genId(): string {
  return `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContentPipelinePage() {
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => { setProjects(loadProjects()); }, []);

  const save = useCallback((updated: ContentProject[]) => {
    setProjects(updated);
    saveProjects(updated);
  }, []);

  // KPIs
  const active = projects.filter(p => !['published', 'promoted'].includes(p.stage)).length;
  const published = projects.filter(p => p.stage === 'published' || p.stage === 'promoted').length;
  const scheduled = projects.filter(p => p.stage === 'scheduled').length;
  const totalViews = projects.reduce((sum, p) => sum + (p.views ?? 0), 0);

  function handleCreate(title: string, type: ContentType) {
    const now = new Date().toISOString();
    const checklist = (DEFAULT_CHECKLISTS[type] ?? DEFAULT_CHECKLISTS.other).map((step, i) => ({
      id: `step_${i}`,
      stepName: step,
      isComplete: false,
    }));
    const project: ContentProject = {
      id: genId(),
      title,
      type,
      stage: 'idea',
      checklist,
      publishDate: null,
      assignedTo: null,
      notes: null,
      views: null,
      likes: null,
      createdAt: now,
      updatedAt: now,
    };
    save([...projects, project]);
    setShowForm(false);
  }

  function handleDrop(stage: ContentStage) {
    if (!dragId) return;
    const updated = projects.map(p => p.id === dragId ? { ...p, stage, updatedAt: new Date().toISOString() } : p);
    save(updated);
    setDragId(null);
  }

  function toggleChecklistItem(projectId: string, itemId: string) {
    const updated = projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        checklist: p.checklist.map(c => c.id === itemId ? { ...c, isComplete: !c.isComplete } : c),
        updatedAt: new Date().toISOString(),
      };
    });
    save(updated);
  }

  function deleteProject(id: string) {
    save(projects.filter(p => p.id !== id));
    setEditId(null);
  }

  return (
    <div>
      <PageHeader title="Content Pipeline" />

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Active', value: active.toString(), color: 'text-blue-400', border: 'border-l-blue-500' },
          { label: 'Published', value: published.toString(), color: 'text-green-400', border: 'border-l-green-500' },
          { label: 'Scheduled', value: scheduled.toString(), color: 'text-amber-400', border: 'border-l-amber-500' },
          { label: 'Total Views', value: totalViews.toLocaleString(), color: 'text-purple-400', border: 'border-l-purple-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border border-gray-700/50 border-l-4 ${kpi.border} bg-gray-800/50 p-4`}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className={`mt-1 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Create Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
        >
          + New Project
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && <CreateForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {/* Detail Panel */}
      {editId && (() => {
        const project = projects.find(p => p.id === editId);
        if (!project) return null;
        return (
          <DetailPanel
            project={project}
            onClose={() => setEditId(null)}
            onToggleCheck={(itemId) => toggleChecklistItem(editId, itemId)}
            onDelete={() => deleteProject(editId)}
          />
        );
      })()}

      {/* Kanban Board */}
      <div className="mt-4 -mx-4 overflow-x-auto px-4">
        <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 220}px` }}>
          {STAGES.map(stage => {
            const stageProjects = projects.filter(p => p.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="flex w-52 shrink-0 flex-col rounded-xl border border-gray-700/50 bg-gray-900/30"
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(stage.key)}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold text-gray-300">{stage.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">{stageProjects.length}</span>
                </div>
                <div className="flex-1 space-y-2 p-2 min-h-[120px]">
                  {stageProjects.map(project => {
                    const done = project.checklist.filter(c => c.isComplete).length;
                    const total = project.checklist.length;
                    return (
                      <div
                        key={project.id}
                        draggable
                        onDragStart={() => setDragId(project.id)}
                        onClick={() => setEditId(project.id)}
                        className="cursor-pointer rounded-lg border border-gray-700/50 bg-gray-800/80 p-2.5 transition-colors hover:border-gray-600"
                      >
                        <p className="text-xs font-medium text-white line-clamp-2">{project.title}</p>
                        <span className="mt-1 inline-block rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300">{TYPE_LABELS[project.type]}</span>
                        {total > 0 && (
                          <div className="mt-2">
                            <div className="h-1 rounded-full bg-gray-700">
                              <div className="h-1 rounded-full bg-green-500" style={{ width: `${(done / total) * 100}%` }} />
                            </div>
                            <p className="mt-0.5 text-[10px] text-gray-500">{done}/{total} steps</p>
                          </div>
                        )}
                        {project.publishDate && (
                          <p className="mt-1 text-[10px] text-gray-500">{project.publishDate}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Form
// ---------------------------------------------------------------------------

function CreateForm({ onSubmit, onCancel }: { onSubmit: (title: string, type: ContentType) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ContentType>('youtube_video');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white">New Content Project</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
              placeholder="Project title..."
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ContentType)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={() => { if (title.trim()) onSubmit(title.trim(), type); }}
            disabled={!title.trim()}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

function DetailPanel({
  project,
  onClose,
  onToggleCheck,
  onDelete,
}: {
  project: ContentProject;
  onClose: () => void;
  onToggleCheck: (itemId: string) => void;
  onDelete: () => void;
}) {
  const stage = STAGES.find(s => s.key === project.stage);
  const done = project.checklist.filter(c => c.isComplete).length;
  const total = project.checklist.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md border-l border-gray-700 bg-gray-900 p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{project.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">&times;</button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: stage?.color }}>
            {stage?.label}
          </span>
          <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">{TYPE_LABELS[project.type]}</span>
        </div>

        {project.publishDate && (
          <p className="mt-3 text-xs text-gray-400">Publish Date: {project.publishDate}</p>
        )}

        {/* Checklist */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase text-gray-400">Checklist</h4>
            <span className="text-xs text-gray-500">{done}/{total}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-700">
            <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
          </div>
          <div className="mt-3 space-y-1">
            {project.checklist.map(item => (
              <button
                key={item.id}
                onClick={() => onToggleCheck(item.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-gray-800"
              >
                <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                  item.isComplete ? 'border-green-500 bg-green-900/50 text-green-400' : 'border-gray-600 text-gray-600'
                }`}>
                  {item.isComplete ? '\u2713' : ''}
                </span>
                <span className={`text-sm ${item.isComplete ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                  {item.stepName}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Analytics (for published) */}
        {(project.stage === 'published' || project.stage === 'promoted') && (
          <div className="mt-5 rounded-lg border border-gray-700/50 bg-gray-800/50 p-3">
            <h4 className="text-xs font-semibold uppercase text-gray-400">Analytics</h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div><p className="text-lg font-bold text-white">{project.views?.toLocaleString() ?? '\u2014'}</p><p className="text-[10px] text-gray-500">Views</p></div>
              <div><p className="text-lg font-bold text-white">{project.likes?.toLocaleString() ?? '\u2014'}</p><p className="text-[10px] text-gray-500">Likes</p></div>
            </div>
          </div>
        )}

        {/* Notes */}
        {project.notes && (
          <div className="mt-5">
            <h4 className="text-xs font-semibold uppercase text-gray-400">Notes</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{project.notes}</p>
          </div>
        )}

        {/* Delete */}
        <div className="mt-8 border-t border-gray-800 pt-4">
          <button onClick={onDelete} className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-2 text-sm text-red-400 hover:bg-red-950/50">
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}
