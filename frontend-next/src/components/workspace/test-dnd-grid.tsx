"use client"

import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Mock workspace data
const mockWorkspaces = [
  { id: '1', name: 'Project Alpha', groupId: 'group1' },
  { id: '2', name: 'Project Beta', groupId: 'group1' },
  { id: '3', name: 'Project Gamma', groupId: 'group1' },
  { id: '4', name: 'Project Delta', groupId: 'group2' },
  { id: '5', name: 'Project Epsilon', groupId: 'group2' },
  { id: '6', name: 'Project Zeta', groupId: null },
  { id: '7', name: 'Project Eta', groupId: null },
];

const mockGroups = [
  { id: 'group1', name: 'Development', workspaces: ['1', '2', '3'] },
  { id: 'group2', name: 'Testing', workspaces: ['4', '5'] },
  { id: null, name: 'Ungrouped', workspaces: ['6', '7'] },
];

interface SortableItemProps {
  id: string;
  name: string;
  isDragging?: boolean;
}

function SortableItem({ id, name, isDragging }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <h3 className="font-medium text-sm">{name}</h3>
      <p className="text-xs text-gray-500">ID: {id}</p>
    </div>
  );
}

interface DroppableGroupProps {
  id: string;
  name: string;
  items: Array<{ id: string; name: string }>;
  activeId: string | null;
}

function DroppableGroup({ id, name, items, activeId }: DroppableGroupProps) {
  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[200px]">
      <h2 className="font-semibold mb-4 text-gray-700">{name}</h2>
      <SortableContext items={items.map(item => item.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <SortableItem
              key={item.id}
              id={item.id}
              name={item.name}
              isDragging={activeId === item.id}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function TestDndGrid() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [groups, setGroups] = useState(mockGroups);
  const [workspaces, setWorkspaces] = useState(mockWorkspaces);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find which groups the active and over items belong to
    const activeWorkspace = workspaces.find(w => w.id === activeId);
    const overWorkspace = workspaces.find(w => w.id === overId);
    
    if (!activeWorkspace) return;
    
    const activeGroupId = activeWorkspace.groupId;
    const overGroupId = overWorkspace?.groupId;
    
    // If moving within the same group, reorder
    if (activeGroupId === overGroupId && overWorkspace) {
      const activeGroup = groups.find(g => g.id === activeGroupId);
      if (activeGroup) {
        const oldIndex = activeGroup.workspaces.indexOf(activeId);
        const newIndex = activeGroup.workspaces.indexOf(overId);
        
        if (oldIndex !== newIndex) {
          setGroups(prevGroups => 
            prevGroups.map(group => 
              group.id === activeGroupId 
                ? { ...group, workspaces: arrayMove(group.workspaces, oldIndex, newIndex) }
                : group
            )
          );
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Handle cross-group moves here if needed
    console.log('Drag ended:', activeId, 'to', overId);
  };

  // Group workspaces by their groupId
  const groupedData = groups.map(group => ({
    ...group,
    items: workspaces.filter(w => w.groupId === group.id)
  }));

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Test DnD Grid - Multiple Containers</h1>
      
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {groupedData.map((group) => (
            <DroppableGroup
              key={group.id || 'ungrouped'}
              id={group.id || 'ungrouped'}
              name={group.name}
              items={group.items}
              activeId={activeId}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
