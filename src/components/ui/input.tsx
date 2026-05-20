import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const isPassword = type === "password"

    const inputElement = (
      <InputPrimitive
        ref={ref}
        type={isPassword ? (showPassword ? "text" : "password") : type}
        data-slot="input"
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          isPassword && "pr-9",
          className
        )}
        {...props}
      />
    )

    if (isPassword) {
      return (
        <div className="relative flex items-center w-full">
          {inputElement}
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={props.disabled}
            className="absolute right-2.5 flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
            style={{ height: "100%", top: 0 }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 select-none" />
            ) : (
              <Eye className="h-4 w-4 select-none" />
            )}
          </button>
        </div>
      )
    }

    return inputElement
  }
)
Input.displayName = "Input"

export { Input }
