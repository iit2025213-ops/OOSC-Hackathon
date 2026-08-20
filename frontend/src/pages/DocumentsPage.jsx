import React from 'react';

export default function DocumentsPage() {
  return (
    <div className="flex-1 px-margin-mobile md:px-margin-desktop max-w-container-max w-full mx-auto py-8 md:py-12">
      <div className="mb-10">
        <h2 className="font-display-md text-display-md text-on-surface">Documents</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">All generated documents and uploaded evidence in one place.</p>
      </div>

      <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center gap-6 min-h-[400px] text-center">
        <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl">description</span>
        </div>
        <div>
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">No documents yet</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            Documents generated during your case journey — demand letters, RTI applications, legal notices — will appear here.
          </p>
        </div>
        <button className="bg-primary text-on-primary-fixed px-6 py-3 rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-primary-fixed transition-colors mt-4">
          <span className="material-symbols-outlined text-sm">upload_file</span>
          Upload Document
        </button>
      </div>
    </div>
  );
}
