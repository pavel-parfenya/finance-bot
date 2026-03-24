import { DataSource, Repository } from "typeorm";
import { CustomCategory } from "../database/entities";

export class CustomCategoryRepository {
  private readonly repo: Repository<CustomCategory>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(CustomCategory);
  }

  async findByWorkspaceId(workspaceId: number): Promise<CustomCategory[]> {
    return this.repo.find({
      where: { workspaceId },
      relations: ["createdBy"],
      order: { name: "ASC" },
    });
  }

  async findById(id: number): Promise<CustomCategory | null> {
    return this.repo.findOne({ where: { id }, relations: ["createdBy"] });
  }

  async create(data: {
    workspaceId: number;
    createdByUserId: number;
    name: string;
    description: string;
  }): Promise<CustomCategory> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(
    id: number,
    data: { name?: string; description?: string }
  ): Promise<CustomCategory | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
