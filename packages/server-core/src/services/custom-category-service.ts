import { CustomCategoryRepository } from "../repositories/custom-category-repository";

export class CustomCategoryService {
  constructor(private readonly repo: CustomCategoryRepository) {}

  async getCategories(workspaceId: number) {
    return this.repo.findByWorkspaceId(workspaceId);
  }

  async getCategoriesPlain(
    workspaceId: number
  ): Promise<Array<{ name: string; description: string }>> {
    const cats = await this.repo.findByWorkspaceId(workspaceId);
    return cats.map((c) => ({ name: c.name, description: c.description }));
  }

  async createCategory(
    workspaceId: number,
    userId: number,
    name: string,
    description: string
  ) {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Название категории не может быть пустым");
    return this.repo.create({
      workspaceId,
      createdByUserId: userId,
      name: trimmedName,
      description: description.trim(),
    });
  }

  async updateCategory(
    categoryId: number,
    userId: number,
    isOwner: boolean,
    updates: { name?: string; description?: string }
  ) {
    const cat = await this.repo.findById(categoryId);
    if (!cat) throw new Error("Категория не найдена");
    if (!isOwner && cat.createdByUserId !== userId) {
      throw new Error("Нет прав на редактирование этой категории");
    }
    const data: { name?: string; description?: string } = {};
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) throw new Error("Название категории не может быть пустым");
      data.name = trimmed;
    }
    if (updates.description !== undefined) {
      data.description = updates.description.trim();
    }
    return this.repo.update(categoryId, data);
  }

  async deleteCategory(categoryId: number, userId: number, isOwner: boolean) {
    const cat = await this.repo.findById(categoryId);
    if (!cat) throw new Error("Категория не найдена");
    if (!isOwner && cat.createdByUserId !== userId) {
      throw new Error("Нет прав на удаление этой категории");
    }
    await this.repo.delete(categoryId);
  }
}
