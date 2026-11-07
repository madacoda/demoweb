"use client";
import Link from "next/link";
import { useListParam } from "../../shared/list-params";
import { useRouter } from "next/navigation";
import {
  assignees,
  dateAfter,
  prettyDate,
  priorities,
  projects,
  taskStatuses,
  type Task,
} from "./_lib/data";
import {
  Badge,
  Empty,
  Field,
  Form,
  Heading,
  Loading,
  Search,
  Submit,
  useDemo,
} from "./ui";
import s from "./sites.module.css";
function TaskCard({ task }: { task: Task }) {
  const { act, busy } = useDemo();
  return (
    <article className={s.taskCard} data-testid={task.id}>
      <div className={s.recordTop}>
        <Badge>{task.priority}</Badge>
        <span className={s.small}>{task.project}</span>
      </div>
      <Link href={`/demo/sites/daybreak/tasks/${task.id}`}>
        <h3>{task.title}</h3>
      </Link>
      <p>{task.description}</p>
      <div className={s.taskMeta}>
        <span className={s.avatar} aria-hidden="true">
          {task.assignee[0]}
        </span>
        <span>{task.assignee}</span>
        <time dateTime={task.due}>{prettyDate(task.due)}</time>
      </div>
      <Field label={`Status for ${task.title}`}>
        <select
          value={task.status}
          disabled={busy}
          onChange={(e) =>
            void act(
              {
                action: "task-move",
                id: task.id,
                version: task.version || 1,
                status: e.target.value,
              },
              "Task moved.",
            )
          }
        >
          {taskStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </Field>
    </article>
  );
}
export function Daybreak({ path }: { path: string[] }) {
  const { state, act, busy } = useDemo(),
    router = useRouter();
  const [query, setQuery] = useListParam("q"),
    [project, setProject] = useListParam("project", "All", [
      "All",
      ...projects,
    ]),
    [assignee, setAssignee] = useListParam("assignee", "All", [
      "All",
      ...assignees,
    ]),
    [priority, setPriority] = useListParam("priority", "All", [
      "All",
      ...priorities,
    ]);
  if (!state) return <Loading />;
  if (path[0] === "new" || path[0] === "tasks") {
    const task =
      path[0] === "tasks"
        ? state.tasks.find((t) => t.id === path[1])
        : undefined;
    if (path[0] === "tasks" && !task)
      return (
        <Empty
          title="Task not found"
          text="This task may have been deleted or belongs to another workspace."
          href="/demo/sites/daybreak"
          label="Back to the board"
        />
      );
    return (
      <>
        <Link className={s.back} href="/demo/sites/daybreak">
          ← Project board
        </Link>
        <Heading
          eyebrow={task ? task.project : "Make a little progress"}
          title={task ? "Task details" : "Create a task"}
          description="A clear next step makes the bigger picture possible."
        />
        <div className={s.editor}>
          <Form
            onSubmit={async (data) => {
              const result = await act({
                ...data,
                action: "task-save",
                ...(task ? { id: task.id, version: task.version || 1 } : {}),
              });
              if (result) router.push("/demo/sites/daybreak");
            }}
          >
            <Field label="Task title">
              <input
                name="title"
                defaultValue={task?.title}
                placeholder="What needs to get done?"
                minLength={3}
                maxLength={120}
                required
              />
            </Field>
            <Field label="Description">
              <textarea
                name="description"
                defaultValue={task?.description}
                maxLength={2000}
                rows={5}
                placeholder="Add context, requirements, or a useful next step."
              />
            </Field>
            <div className={s.formGrid}>
              <Field label="Project">
                <select name="project" defaultValue={task?.project}>
                  {projects.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assignee">
                <select name="assignee" defaultValue={task?.assignee}>
                  {assignees.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  name="priority"
                  defaultValue={task?.priority || "Medium"}
                >
                  {priorities.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select name="status" defaultValue={task?.status}>
                  {taskStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </Field>
              <Field label="Due date">
                <input
                  type="date"
                  name="due"
                  defaultValue={task?.due || dateAfter(7)}
                  required
                />
              </Field>
            </div>
            <div className={s.actions}>
              <Submit>{task ? "Save changes" : "Create task"} →</Submit>
              <Link className={s.secondary} href="/demo/sites/daybreak">
                Cancel
              </Link>
              {task && (
                <button
                  className={s.danger}
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      window.confirm("Delete this task? This cannot be undone.")
                    ) {
                      const result = await act({
                        action: "task-delete",
                        id: task.id,
                        version: task.version || 1,
                      });
                      if (result) router.push("/demo/sites/daybreak");
                    }
                  }}
                >
                  Delete task
                </button>
              )}
            </div>
          </Form>
        </div>
      </>
    );
  }
  const filtered = state.tasks.filter(
    (t) =>
      `${t.title} ${t.description}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()) &&
      (project === "All" || t.project === project) &&
      (assignee === "All" || t.assignee === assignee) &&
      (priority === "All" || t.priority === priority),
  );
  const done = state.tasks.filter((t) => t.status === "Done").length;
  return (
    <>
      <Heading
        eyebrow="Acme Studio / Projects"
        title={path[0] === "list" ? "All tasks" : "Small steps. Big things."}
        description="A little focus, a little teamwork, a lot of possibility."
        action={
          <Link className={s.button} href="/demo/sites/daybreak/new">
            + New task
          </Link>
        }
      />
      <div className={s.stats}>
        <div>
          <span>Total tasks</span>
          <strong>{state.tasks.length}</strong>
          <small>Across {projects.length} projects</small>
        </div>
        <div>
          <span>In progress</span>
          <strong>
            {state.tasks.filter((t) => t.status === "In progress").length}
          </strong>
          <small>Moving things forward</small>
        </div>
        <div>
          <span>Completed</span>
          <strong>{done}</strong>
          <small>
            {state.tasks.length
              ? Math.round((done / state.tasks.length) * 100)
              : 0}
            % of all tasks
          </small>
        </div>
      </div>
      <Search
        query={query}
        setQuery={setQuery}
        placeholder="Find a task…"
        options={projects}
        filter={project}
        setFilter={setProject}
        filterLabel="Project"
      />
      <div className={s.resultBar}>
        <p data-testid="results-count">{filtered.length} tasks</p>
        <div className={s.inlineFields}>
          <Field label="Assignee">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              {["All", ...assignees].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {["All", ...priorities].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      {!filtered.length ? (
        <Empty
          title="A clear space for new ideas."
          text="No tasks match these filters. Clear a filter or create a new task."
          href="/demo/sites/daybreak/new"
          label="Create a task"
        />
      ) : path[0] === "list" ? (
        <section className={s.taskList} aria-label="All tasks">
          <h2 className={s.srOnly}>Tasks</h2>
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </section>
      ) : (
        <div className={s.board}>
          {taskStatuses.map((status) => (
            <section className={s.column} key={status} aria-label={status}>
              <h2>
                <span className={s.statusDot} data-status={status} />
                {status}
                <span>
                  {filtered.filter((t) => t.status === status).length}
                </span>
              </h2>
              {filtered
                .filter((t) => t.status === status)
                .map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              {!filtered.some((t) => t.status === status) && (
                <p className={s.columnEmpty}>Nothing here yet.</p>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
