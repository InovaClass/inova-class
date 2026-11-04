// Adapted from 8bitcn's save-slots block (MIT, https://www.8bitcn.com/docs/blocks/gaming/save-slots)
import { cn } from 'cn'
import Link from 'next/link'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'

type ClassSlot = { id: string; name: string; description: string | null }

type ClassSlotsProps = {
  classes: ClassSlot[]
  hrefOf?: (schoolClass: ClassSlot) => string
}

const SLOT_CLASS_NAME =
  'flex h-full flex-col justify-center gap-2 overflow-hidden border-2 border-border bg-muted/30 p-4'

const SlotContent = ({
  name,
  description,
  isDescriptionTruncated
}: ClassSlot & { isDescriptionTruncated: boolean }) => (
  <>
    {/* Not truncated: two names may differ only at the end, and nothing else tells them apart */}
    <h3 className="text-xs leading-relaxed font-medium wrap-anywhere">
      {name}
    </h3>
    {description && (
      <p
        className={cn(
          'text-xs text-muted-foreground',
          isDescriptionTruncated ? 'truncate' : 'leading-relaxed wrap-anywhere'
        )}
      >
        {description}
      </p>
    )}
  </>
)

export const ClassSlots = ({ classes, hrefOf }: ClassSlotsProps) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2 className="text-center text-sm leading-relaxed">Suas turmas</h2>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((schoolClass) => (
          <li key={schoolClass.id} className="min-w-0">
            {hrefOf ? (
              <Link
                href={hrefOf(schoolClass)}
                className={cn(
                  SLOT_CLASS_NAME,
                  'transition-all duration-200 hover:border-primary hover:bg-accent/50'
                )}
              >
                <SlotContent {...schoolClass} isDescriptionTruncated />
              </Link>
            ) : (
              <div className={SLOT_CLASS_NAME}>
                {/* Without a link there's no page to read the rest of the description on */}
                <SlotContent {...schoolClass} isDescriptionTruncated={false} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
)
