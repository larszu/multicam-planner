import { useCallback, useRef, useState } from 'react';
import { FiUpload, FiPlus, FiX, FiArrowRight, FiCheck } from 'react-icons/fi';
import { useStore } from '../../store/useStore';
import type { EditMode } from '../../types';

const SEEN_KEY = 'mcplan-assistant-seen';

// Ordered steps of the "New Plan" wizard (issue #43): draw the floor plan, then
// the stages, then objects/persons, and finally the cameras.
const WIZARD_STEPS: { mode: EditMode; title: string; hint: string }[] = [
  { mode: 'floorplan', title: '1 · Floor Plan', hint: 'Upload a plan image/PDF, set the scale, and draw the walls.' },
  { mode: 'stage', title: '2 · Stages', hint: 'Add and size the stages. Everything else is locked for now.' },
  { mode: 'objects', title: '3 · Objects & Persons', hint: 'Place performers, instruments and props on the stage.' },
  { mode: 'cameras', title: '4 · Cameras', hint: 'Position the cameras and aim them at the action.' },
];

export default function StartupAssistant() {
  const { loadProject, setEditMode } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seen = typeof window !== 'undefined' && window.sessionStorage.getItem(SEEN_KEY) === '1';
  const [phase, setPhase] = useState<'choose' | 'wizard' | 'done'>(seen ? 'done' : 'choose');
  const [stepIndex, setStepIndex] = useState(0);

  const markSeen = useCallback(() => {
    try { window.sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
  }, []);

  const dismiss = useCallback(() => { markSeen(); setPhase('done'); }, [markSeen]);

  const startWizard = useCallback(() => {
    markSeen();
    setStepIndex(0);
    setEditMode(WIZARD_STEPS[0].mode);
    setPhase('wizard');
  }, [markSeen, setEditMode]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await loadProject(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setEditMode('cameras'); // an existing plan jumps straight to camera editing
    dismiss();
  }, [loadProject, setEditMode, dismiss]);

  const nextStep = useCallback(() => {
    setStepIndex((i) => {
      const next = i + 1;
      if (next >= WIZARD_STEPS.length) {
        setEditMode('all');
        setPhase('done');
        return i;
      }
      setEditMode(WIZARD_STEPS[next].mode);
      return next;
    });
  }, [setEditMode]);

  const finishWizard = useCallback(() => { setEditMode('all'); setPhase('done'); }, [setEditMode]);

  if (phase === 'done') return null;

  if (phase === 'wizard') {
    const step = WIZARD_STEPS[stepIndex];
    const isLast = stepIndex === WIZARD_STEPS.length - 1;
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-[420px] max-w-[92vw] rounded-xl border border-bc-border bg-bc-panel shadow-2xl px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-bc-yellow text-xs font-semibold">{step.title}</div>
            <div className="text-gray-300 text-xs mt-1 leading-relaxed">{step.hint}</div>
          </div>
          <button onClick={finishWizard} className="p-1 text-gray-500 hover:text-white" title="Exit assistant (unlock everything)">
            <FiX size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1">
            {WIZARD_STEPS.map((s, i) => (
              <span key={s.mode} className={`h-1.5 w-6 rounded-full ${i <= stepIndex ? 'bg-bc-yellow' : 'bg-bc-border'}`} />
            ))}
          </div>
          <button
            onClick={isLast ? finishWizard : nextStep}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bc-accent text-white text-xs font-medium hover:bg-bc-accent/80"
          >
            {isLast ? <><FiCheck size={13} /> Finish</> : <>Next <FiArrowRight size={13} /></>}
          </button>
        </div>
      </div>
    );
  }

  // phase === 'choose'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[440px] max-w-[92vw] rounded-2xl border border-bc-border bg-bc-panel shadow-2xl p-6 relative">
        <button onClick={dismiss} className="absolute top-3 right-3 p-1 text-gray-500 hover:text-white" title="Close">
          <FiX size={16} />
        </button>
        <h2 className="text-white font-bold text-lg">Welcome to MultiCam Planner</h2>
        <p className="text-gray-400 text-sm mt-1">How would you like to start?</p>
        <div className="grid grid-cols-1 gap-3 mt-5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 rounded-xl border border-bc-border bg-bc-dark px-4 py-3 text-left hover:border-bc-accent transition-colors"
          >
            <FiUpload size={20} className="text-bc-accent shrink-0" />
            <span>
              <span className="block text-white text-sm font-medium">Load Plan</span>
              <span className="block text-gray-500 text-xs">Open an existing .mcplan file and jump to camera editing</span>
            </span>
          </button>
          <button
            onClick={startWizard}
            className="flex items-center gap-3 rounded-xl border border-bc-border bg-bc-dark px-4 py-3 text-left hover:border-bc-accent transition-colors"
          >
            <FiPlus size={20} className="text-bc-yellow shrink-0" />
            <span>
              <span className="block text-white text-sm font-medium">New Plan</span>
              <span className="block text-gray-500 text-xs">Step through floor plan → stages → objects → cameras</span>
            </span>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".mcplan,.json" className="hidden" onChange={handleFileChange} />
      </div>
    </div>
  );
}
