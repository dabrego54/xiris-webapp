import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  type ControllerProps,
  FormProvider,
  useFormContext,
} from "react-hook-form"

import { cn } from "@/lib/utils"

const Form = FormProvider

type FormFieldContextValue = {
  name: string
}

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(
  undefined,
)

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const fieldState = getFieldState(fieldContext.name, formState)

  return {
    id: itemContext?.id,
    name: fieldContext.name,
    formItemId: itemContext?.formItemId,
    formDescriptionId: itemContext?.formDescriptionId,
    formMessageId: itemContext?.formMessageId,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
  formItemId: string
  formDescriptionId: string
  formMessageId: string
}

const FormItemContext = React.createContext<FormItemContextValue | undefined>(
  undefined,
)

const FormField = <TFieldValues extends Record<string, unknown>, TName extends string>(
  props: ControllerProps<TFieldValues, TName>,
) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId()

    return (
      <FormItemContext.Provider
        value={{
          id,
          formItemId: `${id}-form-item`,
          formDescriptionId: `${id}-form-item-description`,
          formMessageId: `${id}-form-item-message`,
        }}
      >
        <div ref={ref} className={cn("space-y-2", className)} {...props} />
      </FormItemContext.Provider>
    )
  },
)
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { formItemId } = useFormField()

  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        "text-sm font-medium text-slate-900",
        className,
      )}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = LabelPrimitive.Root.displayName

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { formItemId } = useFormField()

  return <Slot ref={ref} id={formItemId} {...props} />
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-xs text-slate-500", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { formMessageId } = useFormField()
  const { error } = useFormField()

  const body = error ? String(error.message) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-red-500", className)}
      role="alert"
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
}
