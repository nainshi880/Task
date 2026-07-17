/**
 * Shared soft-delete helpers for models with isDeleted / deletedAt fields.
 */

export function withNotDeleted(filter = {}) {
  return {
    ...filter,
    isDeleted: { $ne: true },
  };
}

export function softDeleteUpdate(deletedBy = null) {
  return {
    isDeleted: true,
    deletedAt: new Date(),
    ...(deletedBy ? { deletedBy } : {}),
  };
}

export async function softDeleteById(Model, id, deletedBy = null) {
  return Model.findByIdAndUpdate(id, softDeleteUpdate(deletedBy), {
    new: true,
    runValidators: true,
  });
}

export default {
  withNotDeleted,
  softDeleteUpdate,
  softDeleteById,
};
