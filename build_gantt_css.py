import io

css_append = """

/* Drag & Drop Interactability Additions */
.gantt-wrapper.is-dragging {
    cursor: grabbing !important;
}

.gantt-task-bar {
    position: absolute;
    height: 30px;
    background: var(--primary);
    border-radius: 6px;
    display: flex;
    align-items: center;
    color: white;
    font-size: 0.85rem;
    cursor: grab;
    transition: box-shadow 0.2s, filter 0.2s;
    user-select: none;
    z-index: 10;
}

.gantt-task-bar:active, .gantt-task-bar.dragging {
    cursor: grabbing;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    filter: brightness(1.2);
    z-index: 999;
}

.gantt-resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 10px;
    cursor: ew-resize;
    z-index: 20;
}

.gantt-resize-handle.left {
    left: -5px;
}

.gantt-resize-handle.right {
    right: -5px;
}

.gantt-resize-handle:hover {
    background: rgba(255, 255, 255, 0.4);
}
"""

with io.open('c:/Apps/python/Invoice_Project_Lead/frontend/src/pages/GanttBoard.css', 'a', encoding='utf-8') as f:
    f.write(css_append)

print("CSS appended.")
