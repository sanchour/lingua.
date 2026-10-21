import { Route } from 'lucide-react';
import { Card, EmptyState } from '@/design/primitives';

/** Cursus › Course until the course is built (handover step 4). */
export function CourseTab() {
  return (
    <Card>
      <EmptyState icon={Route} title="The course is coming">
        A path of units named by what you can do after them, for the six core languages. Until then, Grammatica and the rest of Lingua work as always.
      </EmptyState>
    </Card>
  );
}
