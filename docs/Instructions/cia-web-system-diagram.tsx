import React, { useState } from 'react';
import { 
  Database, Server, Monitor, Glasses, Users, Cloud, Cpu, HardDrive,
  Wifi, Video, MousePointer2, Box, Layers, GitBranch, ArrowRight,
  ArrowDown, ArrowLeftRight, Zap, Shield, Globe, Code
} from 'lucide-react';

export default function SystemArchitectureDiagram() {
  const [activeLayer, setActiveLayer] = useState(null);
  
  const layers = [
    { id: 'client', label: 'Client Layer', color: '#6eb6ff' },
    { id: 'api', label: 'API Layer', color: '#4caf50' },
    { id: 'render', label: 'Render Layer', color: '#ff9800' },
    { id: 'data', label: 'Data Layer', color: '#e91e63' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-6 overflow-auto">
      <h1 className="text-2xl font-bold mb-2 text-center">CIA Web System Architecture</h1>
      <p className="text-gray-500 text-center mb-6 text-sm">Server-Authority + Plugin Architecture + VR-First Design</p>
      
      {/* Layer Legend */}
      <div className="flex justify-center gap-4 mb-8">
        {layers.map(layer => (
          <button
            key={layer.id}
            onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all ${
              activeLayer === layer.id ? 'ring-2 ring-white' : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: `${layer.color}30`, borderColor: layer.color }}
          >
            <div className="w-3 h-3 rounded" style={{ backgroundColor: layer.color }} />
            {layer.label}
          </button>
        ))}
      </div>

      {/* Main Diagram */}
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* CLIENT LAYER */}
        <div className={`p-4 rounded-xl border-2 transition-all ${
          activeLayer && activeLayer !== 'client' ? 'opacity-30' : ''
        }`} style={{ borderColor: '#6eb6ff', backgroundColor: '#6eb6ff10' }}>
          <div className="flex items-center gap-2 mb-4">
            <Monitor size={20} style={{ color: '#6eb6ff' }} />
            <span className="font-semibold" style={{ color: '#6eb6ff' }}>Client Layer</span>
            <span className="text-xs text-gray-500 ml-2">Browser / VR Headset</span>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            {/* Desktop Client */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={16} className="text-blue-400" />
                <span className="text-sm font-medium">Desktop Client</span>
              </div>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Code size={10} />
                  <span>React UI</span>
                </div>
                <div className="flex items-center gap-1">
                  <Box size={10} />
                  <span>VTK.js (client render)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Video size={10} />
                  <span>OR Video decoder</span>
                </div>
              </div>
            </div>
            
            {/* VR Client */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Glasses size={16} className="text-purple-400" />
                <span className="text-sm font-medium">VR Client</span>
              </div>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Zap size={10} />
                  <span>WebXR</span>
                </div>
                <div className="flex items-center gap-1">
                  <Video size={10} />
                  <span>Video decoder (90fps)</span>
                </div>
                <div className="flex items-center gap-1">
                  <MousePointer2 size={10} />
                  <span>Controller input</span>
                </div>
              </div>
            </div>
            
            {/* Plugin Handlers */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10 col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Layers size={16} className="text-green-400" />
                <span className="text-sm font-medium">Instance Type Handlers (Plugin Architecture)</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {['VTK', 'Molecule', 'Plotly', 'Image', 'Notes', 'Custom...'].map(type => (
                  <span key={type} className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                    {type}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Each handler provides: toolbar config, VR support, render mode, interactions
              </div>
            </div>
          </div>
        </div>

        {/* Connection arrows */}
        <div className="flex justify-center">
          <div className="flex items-center gap-4 text-gray-600">
            <ArrowDown size={20} />
            <span className="text-xs">WebSocket + WebRTC</span>
            <ArrowDown size={20} />
          </div>
        </div>

        {/* API LAYER */}
        <div className={`p-4 rounded-xl border-2 transition-all ${
          activeLayer && activeLayer !== 'api' ? 'opacity-30' : ''
        }`} style={{ borderColor: '#4caf50', backgroundColor: '#4caf5010' }}>
          <div className="flex items-center gap-2 mb-4">
            <Server size={20} style={{ color: '#4caf50' }} />
            <span className="font-semibold" style={{ color: '#4caf50' }}>API Layer</span>
            <span className="text-xs text-gray-500 ml-2">Server Authority</span>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            {/* REST API */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="text-sm font-medium mb-2">REST API</div>
              <div className="space-y-1 text-xs text-gray-400">
                <div>/api/projects</div>
                <div>/api/datasets</div>
                <div>/api/views</div>
                <div>/api/canvases</div>
                <div>/api/subsets</div>
              </div>
            </div>
            
            {/* Y.js Server */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="text-sm font-medium mb-2">Y.js WebSocket</div>
              <div className="space-y-1 text-xs text-gray-400">
                <div>• Cursor positions</div>
                <div>• Avatar positions (VR)</div>
                <div>• Presence awareness</div>
                <div className="text-yellow-400/70 mt-2">⚠️ Presence only (not state)</div>
              </div>
            </div>
            
            {/* LiveKit */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="text-sm font-medium mb-2">LiveKit (Voice)</div>
              <div className="space-y-1 text-xs text-gray-400">
                <div>• Spatial audio</div>
                <div>• Room management</div>
                <div>• Breakout rooms</div>
              </div>
            </div>
            
            {/* Auth */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="text-sm font-medium mb-2">Auth (Keycloak)</div>
              <div className="space-y-1 text-xs text-gray-400">
                <div>• JWT tokens</div>
                <div>• RBAC</div>
                <div>• Multi-tenant</div>
                <div>• Audit logging</div>
              </div>
            </div>
          </div>
        </div>

        {/* Connection arrows */}
        <div className="flex justify-around">
          <div className="flex items-center gap-2 text-gray-600">
            <ArrowDown size={20} />
            <span className="text-xs">Scene + Interactions</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <ArrowDown size={20} />
            <span className="text-xs">Data Queries</span>
          </div>
        </div>

        {/* RENDER LAYER */}
        <div className={`p-4 rounded-xl border-2 transition-all ${
          activeLayer && activeLayer !== 'render' ? 'opacity-30' : ''
        }`} style={{ borderColor: '#ff9800', backgroundColor: '#ff980010' }}>
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={20} style={{ color: '#ff9800' }} />
            <span className="font-semibold" style={{ color: '#ff9800' }}>GPU Render Layer</span>
            <span className="text-xs text-gray-500 ml-2">Server-Side Rendering for VR</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Render Workers */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10 col-span-2">
              <div className="text-sm font-medium mb-2">Render Worker Pool</div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-orange-500/20 rounded p-2 text-center">
                    <Cpu size={16} className="mx-auto mb-1 text-orange-400" />
                    <div className="text-xs text-orange-400">GPU {i}</div>
                    <div className="text-xs text-gray-500">T4/A10G</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>• VTK (Python/C++) server-side rendering</div>
                <div>• NVENC hardware encoding (H.264/VP9)</div>
                <div>• WebRTC streaming to clients</div>
                <div>• Priority: VR (90fps) → Interactive (60fps) → Batch</div>
              </div>
            </div>
            
            {/* Session Manager */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="text-sm font-medium mb-2">Session Manager</div>
              <div className="space-y-1 text-xs text-gray-400">
                <div>• GPU allocation</div>
                <div>• Load balancing</div>
                <div>• Memory quotas</div>
                <div>• Auto-scaling</div>
                <div className="mt-2 text-green-400/70">Target: &lt;32ms latency</div>
              </div>
            </div>
          </div>
        </div>

        {/* Connection arrows */}
        <div className="flex justify-center">
          <div className="flex items-center gap-4 text-gray-600">
            <ArrowDown size={20} />
            <span className="text-xs">Dataset Loading</span>
            <ArrowDown size={20} />
          </div>
        </div>

        {/* DATA LAYER */}
        <div className={`p-4 rounded-xl border-2 transition-all ${
          activeLayer && activeLayer !== 'data' ? 'opacity-30' : ''
        }`} style={{ borderColor: '#e91e63', backgroundColor: '#e91e6310' }}>
          <div className="flex items-center gap-2 mb-4">
            <Database size={20} style={{ color: '#e91e63' }} />
            <span className="font-semibold" style={{ color: '#e91e63' }}>Data Layer</span>
            <span className="text-xs text-gray-500 ml-2">Source of Truth</span>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            {/* PostgreSQL */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="text-sm font-medium mb-2">PostgreSQL</div>
              <div className="space-y-1 text-xs text-gray-400">
                <div>• Projects</div>
                <div>• Datasets (metadata)</div>
                <div>• ViewConfigurations</div>
                <div>• Canvases & Placements</div>
                <div>• Subsets</div>
                <div>• Users & Orgs</div>
              </div>
            </div>
            
            {/* S3/MinIO */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="text-sm font-medium mb-2">S3 / MinIO</div>
              <div className="space-y-1 text-xs text-gray-400">
                <div>• Dataset files</div>
                <div>• NIFTI, DICOM, VTK</div>
                <div>• Images, attachments</div>
                <div>• Session recordings</div>
              </div>
            </div>
            
            {/* Redis */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="text-sm font-medium mb-2">Redis</div>
              <div className="space-y-1 text-xs text-gray-400">
                <div>• Session cache</div>
                <div>• Viewport positions</div>
                <div>• Rate limiting</div>
                <div>• Pub/sub for sync</div>
              </div>
            </div>
            
            {/* Audit Log */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
              <div className="text-sm font-medium mb-2">Audit Log</div>
              <div className="space-y-1 text-xs text-gray-400">
                <div>• All state changes</div>
                <div>• User actions</div>
                <div>• Compliance trail</div>
                <div>• Reproducibility</div>
              </div>
            </div>
          </div>
        </div>

        {/* Three-Layer Data Model */}
        <div className="mt-8 p-4 bg-gray-900/50 rounded-xl border border-white/10">
          <h3 className="text-sm font-semibold mb-4 text-center">Three-Layer Data Model</h3>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center p-3 bg-blue-500/20 rounded-lg border border-blue-500/50 w-40">
              <Database size={24} className="mx-auto mb-2 text-blue-400" />
              <div className="text-sm font-medium text-blue-400">Dataset</div>
              <div className="text-xs text-gray-400 mt-1">Raw data + Annotations</div>
              <div className="text-xs text-gray-500">Immutable, auditable</div>
            </div>
            
            <ArrowRight size={24} className="text-gray-600" />
            
            <div className="text-center p-3 bg-green-500/20 rounded-lg border border-green-500/50 w-40">
              <Layers size={24} className="mx-auto mb-2 text-green-400" />
              <div className="text-sm font-medium text-green-400">ViewConfiguration</div>
              <div className="text-xs text-gray-400 mt-1">Camera, filters, colormap</div>
              <div className="text-xs text-gray-500">Server ID, collaborative</div>
            </div>
            
            <ArrowRight size={24} className="text-gray-600" />
            
            <div className="text-center p-3 bg-orange-500/20 rounded-lg border border-orange-500/50 w-40">
              <Monitor size={24} className="mx-auto mb-2 text-orange-400" />
              <div className="text-sm font-medium text-orange-400">InstanceWindow</div>
              <div className="text-xs text-gray-400 mt-1">GPU renderer</div>
              <div className="text-xs text-gray-500">Ephemeral, client ID</div>
            </div>
          </div>
        </div>

        {/* Key Principles */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="p-3 bg-gray-900/50 rounded-lg border border-white/10 text-center">
            <Shield size={20} className="mx-auto mb-2 text-blue-400" />
            <div className="text-xs font-medium">Server Authority</div>
            <div className="text-xs text-gray-500">All state from server</div>
          </div>
          <div className="p-3 bg-gray-900/50 rounded-lg border border-white/10 text-center">
            <Glasses size={20} className="mx-auto mb-2 text-purple-400" />
            <div className="text-xs font-medium">VR-First</div>
            <div className="text-xs text-gray-500">Designed for immersion</div>
          </div>
          <div className="p-3 bg-gray-900/50 rounded-lg border border-white/10 text-center">
            <GitBranch size={20} className="mx-auto mb-2 text-green-400" />
            <div className="text-xs font-medium">Plugin Architecture</div>
            <div className="text-xs text-gray-500">Extensible handlers</div>
          </div>
          <div className="p-3 bg-gray-900/50 rounded-lg border border-white/10 text-center">
            <Users size={20} className="mx-auto mb-2 text-yellow-400" />
            <div className="text-xs font-medium">Collaborative</div>
            <div className="text-xs text-gray-500">Real-time presence</div>
          </div>
        </div>
      </div>
    </div>
  );
}
