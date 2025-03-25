
import * as React from "react"
import { 
  Toast as ToastPrimitive,
  ToastActionElement, 
  ToastProps 
} from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000 // Changed from 1000000 to 5000 (5 seconds)

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action

      if (toastId === undefined) {
        return {
          ...state,
          toasts: state.toasts.map((t) => ({
            ...t,
            open: false,
          })),
        }
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }

    default:
      return state
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  // Clear any existing timeout for this toast
  if (toastTimeouts.has(id)) {
    clearTimeout(toastTimeouts.get(id))
    toastTimeouts.delete(id)
  }

  // Set up auto-dismiss after delay
  const timeout = setTimeout(() => {
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })
    toastTimeouts.delete(id)
    
    // Add a second timeout to remove the toast after dismiss animation
    setTimeout(() => {
      dispatch({ type: actionTypes.REMOVE_TOAST, toastId: id })
    }, 300) // Animation duration
  }, props.duration || TOAST_REMOVE_DELAY)
  
  toastTimeouts.set(id, timeout)

  const update = (props: ToasterToast) => {
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    })
    
    // Reset the auto-dismiss timeout when toast is updated
    if (toastTimeouts.has(id)) {
      clearTimeout(toastTimeouts.get(id))
      toastTimeouts.delete(id)
    }
    
    const newTimeout = setTimeout(() => {
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })
      toastTimeouts.delete(id)
      
      setTimeout(() => {
        dispatch({ type: actionTypes.REMOVE_TOAST, toastId: id })
      }, 300) // Animation duration
    }, props.duration || TOAST_REMOVE_DELAY)
    
    toastTimeouts.set(id, newTimeout)
  }

  const dismiss = () => {
    if (toastTimeouts.has(id)) {
      clearTimeout(toastTimeouts.get(id))
      toastTimeouts.delete(id)
    }
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })
    
    // Add a timeout to remove the toast after dismiss animation
    setTimeout(() => {
      dispatch({ type: actionTypes.REMOVE_TOAST, toastId: id })
    }, 300) // Animation duration
  }

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  }
}

// Improved helper functions with more consistent behavior
toast.success = (title: string, description?: string) => {
  console.log("Success toast:", title, description);
  return toast({ 
    title, 
    description, 
    variant: "success" as ToastProps["variant"],
    duration: 5000 // 5 seconds
  })
}

toast.error = (title: string, description?: string) => {
  console.log("Error toast:", title, description);
  return toast({ 
    title, 
    description, 
    variant: "destructive",
    duration: 7000 // 7 seconds for errors
  })
}

toast.warning = (title: string, description?: string) => {
  console.log("Warning toast:", title, description);
  return toast({ 
    title, 
    description, 
    variant: "warning" as ToastProps["variant"],
    duration: 5000
  })
}

toast.info = (title: string, description?: string) => {
  console.log("Info toast:", title, description);
  return toast({ 
    title, 
    description, 
    variant: "default",
    duration: 4000
  })
}

export { useToast, toast }
