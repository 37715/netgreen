"use client";

export function ConfirmDeleteLead({
  id,
  action,
}: {
  id: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Delete this lead permanently?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-danger w-full">Delete lead</button>
    </form>
  );
}
