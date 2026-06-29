import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MentionList, type MentionListHandle, type MentionUser } from "@/modules/messages/components/MentionList";
import { createRef } from "react";

const mockItems: MentionUser[] = [
  { id: "u1", username: "alice", fullName: "Alice Smith", avatarUrl: null },
  { id: "u2", username: "bob", fullName: "Bob Jones", avatarUrl: null },
  { id: "u3", username: "charlie", fullName: null, avatarUrl: null },
];

describe("MentionList", () => {
  it("renders all items", () => {
    const command = vi.fn();
    render(<MentionList items={mockItems} command={command} />);
    expect(screen.getByText("@alice")).toBeDefined();
    expect(screen.getByText("@bob")).toBeDefined();
    expect(screen.getByText("@charlie")).toBeDefined();
  });

  it("displays fullName when available", () => {
    const command = vi.fn();
    render(<MentionList items={mockItems} command={command} />);
    expect(screen.getByText("Alice Smith")).toBeDefined();
    expect(screen.getByText("Bob Jones")).toBeDefined();
  });

  it("renders nothing when items are empty", () => {
    const command = vi.fn();
    const { container } = render(<MentionList items={[]} command={command} />);
    expect(container.innerHTML).toBe("");
  });

  it("calls command with selected item on Enter", () => {
    const command = vi.fn();
    const ref = createRef<MentionListHandle>();
    render(<MentionList ref={ref} items={mockItems} command={command} />);

    ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "Enter" }) });
    expect(command).toHaveBeenCalledWith({ id: "u1", label: "alice" });
  });

  it("calls command with selected item on Tab", () => {
    const command = vi.fn();
    const ref = createRef<MentionListHandle>();
    render(<MentionList ref={ref} items={mockItems} command={command} />);

    ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "Tab" }) });
    expect(command).toHaveBeenCalledWith({ id: "u1", label: "alice" });
  });

  it("navigates down with ArrowDown", () => {
    const command = vi.fn();
    const ref = createRef<MentionListHandle>();
    render(<MentionList ref={ref} items={mockItems} command={command} />);

    act(() => { ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) }); });
    act(() => { ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "Enter" }) }); });
    expect(command).toHaveBeenCalledWith({ id: "u2", label: "bob" });
  });

  it("navigates up with ArrowUp", () => {
    const command = vi.fn();
    const ref = createRef<MentionListHandle>();
    render(<MentionList ref={ref} items={mockItems} command={command} />);

    act(() => { ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) }); });
    act(() => { ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowUp" }) }); });
    act(() => { ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "Enter" }) }); });
    expect(command).toHaveBeenCalledWith({ id: "u1", label: "alice" });
  });

  it("wraps around from last to first on ArrowDown", () => {
    const command = vi.fn();
    const ref = createRef<MentionListHandle>();
    render(<MentionList ref={ref} items={mockItems} command={command} />);

    const items = mockItems.length;
    for (let i = 0; i < items; i++) {
      act(() => { ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) }); });
    }
    act(() => { ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "Enter" }) }); });
    expect(command).toHaveBeenCalledWith({ id: "u1", label: "alice" });
  });

  it("wraps around from first to last on ArrowUp", () => {
    const command = vi.fn();
    const ref = createRef<MentionListHandle>();
    render(<MentionList ref={ref} items={mockItems} command={command} />);

    act(() => { ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowUp" }) }); });
    act(() => { ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "Enter" }) }); });
    expect(command).toHaveBeenCalledWith({ id: "u3", label: "charlie" });
  });

  it("selects item on click", () => {
    const command = vi.fn();
    render(<MentionList items={mockItems} command={command} />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]);
    expect(command).toHaveBeenCalledWith({ id: "u3", label: "charlie" });
  });

  it("returns false for unhandled keys", () => {
    const ref = createRef<MentionListHandle>();
    render(<MentionList ref={ref} items={mockItems} command={vi.fn()} />);

    const result = ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "Escape" }) });
    expect(result).toBe(false);
  });
});
