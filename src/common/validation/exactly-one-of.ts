import {
  registerDecorator,
  ValidateIf,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const isPresent = (value: unknown): boolean =>
  value !== undefined && value !== null;

/**
 * Marks a property as part of a group where exactly one property must be sent.
 * Put it on every property of the group, instead of `@IsOptional()`:
 * - a property's own validators only run when it is present;
 * - the first property of the group also reports the "exactly one" rule (once), which
 *   fails when none or more than one of the group is present.
 */
export function ExactlyOneOf(
  properties: readonly string[],
  options?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    const reportsRule = properties[0] === propertyName;

    ValidateIf(
      (o: Record<string, unknown>) =>
        isPresent(o[propertyName as string]) ||
        (reportsRule && properties.every((p) => !isPresent(o[p]))),
    )(target, propertyName);

    if (!reportsRule) return;
    registerDecorator({
      name: 'exactlyOneOf',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [properties],
      options: {
        message: `exactly one of ${properties.join(', ')} must be provided`,
        ...options,
      },
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const group = args.constraints[0] as string[];
          const object = args.object as Record<string, unknown>;
          return group.filter((p) => isPresent(object[p])).length === 1;
        },
      },
    });
  };
}
